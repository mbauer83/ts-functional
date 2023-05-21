import {MonadicSet} from './MonadicSet';
import {type Either, Left, Right} from './Either';
import {Predicate} from './Predicate';
import {None, type Optional, Some, optionalFromValue} from './Optional';
import {optionalToEither} from './optionalHelper';

class GraphIsNotConnectedError extends Error {
	constructor() {
		super('Graph is not connected.');
	}
}

class GraphNode<T> {
	constructor(public readonly name: string, public readonly payload: T) {}
}

type Graph<T> = {
	addNode(node: GraphNode<T>): void;
	removeNode(node: GraphNode<T>): void;
	removeNode(nodeName: string): void;
	addEdge(from: GraphNode<T>, to: GraphNode<T>): void;
	addEdge(from: string, to: string): void;
	removeEdge(from: GraphNode<T>, to: GraphNode<T>): void;
	removeEdge(from: string, to: string): void;
	getNodes(): MonadicSet<GraphNode<T>>;
	getEdges(): MonadicSet<[GraphNode<T>, GraphNode<T>]>;
	getNeighbors(node: GraphNode<T>): MonadicSet<GraphNode<T>>;
	getNeighbors(nodeName: string): MonadicSet<GraphNode<T>>;
	hasCycles(): boolean;
	isConnected(): boolean;
	depthFirstSearch(foundIndicator: (node: GraphNode<T>) => boolean): Optional<GraphNode<T>>;
	depthFirstSearchAll(foundIndicator: (node: GraphNode<T>) => boolean): MonadicSet<GraphNode<T>>;
	breadthFirstSearch(foundIndicator: (node: GraphNode<T>) => boolean): Optional<GraphNode<T>>;
	breadthFirstSearchAll(foundIndicator: (node: GraphNode<T>) => boolean): MonadicSet<GraphNode<T>>;
	getSpanningTree(): Either<GraphIsNotConnectedError, Graph<T>>;
};

class AdjacencyMatrixGraph<T> {
	private nodes = new MonadicSet<GraphNode<T>>();
	private edges = new MonadicSet<[GraphNode<T>, GraphNode<T>]>();
	private readonly adjacencyMatrix: boolean[][] = [];
	private readonly nodeIndexMap = new Map<string, number>();
	private readonly nodeMap = new Map<number, GraphNode<T>>();

	addNode(node: GraphNode<T>): void {
		if (this.nodes.has(node)) {
			throw new Error('Node already exists');
		}

		this.nodes.add(node);
		const size = this.nodes.getSize() - 1;
		this.nodeIndexMap.set(node.name, size);
		this.nodeMap.set(size, node);
		this.adjacencyMatrix.push(Array.from({length: size + 1}, () => false));
		for (const matrixRow of this.adjacencyMatrix) {
			matrixRow.push(false);
		}
	}

	removeNode(node: GraphNode<T>): void;
	removeNode(nodeName: string): void;
	removeNode(node: GraphNode<T> | string): Either<Error, void> {
		if (node instanceof GraphNode && !this.nodes.has(node)) {
			return new Right<Error, void>(undefined);
		}

		const optionalGraphNode: Either<Error, GraphNode<T>> = this.findNodeOrError(node);
		if (!optionalGraphNode.isRight()) {
			return optionalGraphNode.map(() => undefined);
		}

		const graphNode = optionalGraphNode.get();
		const index = this.nodeIndexMap.get(graphNode.name)!;
		this.nodes = this.nodes.delete(graphNode);
		this.nodeIndexMap.delete(graphNode.name);
		this.nodeMap.delete(index);
		this.adjacencyMatrix.splice(index, 1);
		for (const matrixRow of this.adjacencyMatrix) {
			matrixRow.splice(index, 1);
		}

		this.edges = this.edges.filter(new Predicate(([from, to]) => from !== graphNode && to !== graphNode));
		return new Right<Error, void>(undefined);
	}

	addEdge(from: GraphNode<T>, to: GraphNode<T>): void;
	addEdge(from: string, to: string): void;
	addEdge(from: GraphNode<T> | string, to: GraphNode<T> | string): Either<Error, void> {
		const graphNodeFromOrerror: Either<Error, GraphNode<T>> = this.findNodeOrError(from, '`from` node does not exist in graph.');
		const graphNodeToOrError: Either<Error, GraphNode<T>> = this.findNodeOrError(to, '`to` node does not exist in graph.');
		const folded = graphNodeFromOrerror.fold<Error, void>(
			l => l,
			_ => undefined,
		);

		if (folded !== undefined) {
			return new Left<Error, void>(folded);
		}

		const graphNodeFrom = graphNodeFromOrerror.get() as GraphNode<T>;
		const graphNodeTo = graphNodeToOrError.get() as GraphNode<T>;
		const fromIndex = this.nodeIndexMap.get(graphNodeFrom.name)!;
		const toIndex = this.nodeIndexMap.get(graphNodeTo.name)!;
		this.adjacencyMatrix[fromIndex][toIndex] = true;
		this.edges.add([graphNodeFrom, graphNodeTo]);
		return new Right<Error, void>(undefined);
	}

	removeEdge(from: GraphNode<T>, to: GraphNode<T>): void;
	removeEdge(from: string, to: string): void;
	removeEdge(from: GraphNode<T> | string, to: GraphNode<T> | string): Either<Error, void> {
		const graphNodeFromOrerror: Either<Error, GraphNode<T>> = this.findNodeOrError(from, '`from` node does not exist in graph.');
		const graphNodeToOrError: Either<Error, GraphNode<T>> = this.findNodeOrError(to, '`to` node does not exist in graph.');
		const folded = graphNodeFromOrerror.fold<Error, void>(
			l => l,
			_ => undefined,
		);

		if (folded !== undefined) {
			return new Left<Error, void>(folded);
		}

		const graphNodeFrom = graphNodeFromOrerror.get() as GraphNode<T>;
		const graphNodeTo = graphNodeToOrError.get() as GraphNode<T>;
		const fromIndex = this.nodeIndexMap.get(graphNodeFrom.name)!;
		const toIndex = this.nodeIndexMap.get(graphNodeTo.name)!;
		this.adjacencyMatrix[fromIndex][toIndex] = false;
		this.edges = this.edges.delete([graphNodeFrom, graphNodeTo]);
		return new Right<Error, void>(undefined);
	}

	getNodes(): MonadicSet<GraphNode<T>> {
		return this.nodes.clone();
	}

	getEdges(): MonadicSet<[GraphNode<T>, GraphNode<T>]> {
		return this.edges.clone();
	}

	getNeighbors(node: GraphNode<T>): MonadicSet<GraphNode<T>>;
	getNeighbors(nodeName: string): MonadicSet<GraphNode<T>>;
	getNeighbors(node: GraphNode<T> | string): MonadicSet<GraphNode<T>> {
		let neighbors = new MonadicSet<GraphNode<T>>();
		const graphNodeOrError: Either<Error, GraphNode<T>> = this.findNodeOrError(node);
		if (!graphNodeOrError.isRight()) {
			return neighbors;
		}

		const graphNode = graphNodeOrError.get();
		const index = this.nodeIndexMap.get(graphNode.name)!;

		for (let i = 0; i < this.adjacencyMatrix[index].length; i++) {
			if (this.adjacencyMatrix[index][i]) {
				neighbors = neighbors.add(this.nodeMap.get(i)!);
			}
		}

		return neighbors;
	}

	isConnected(): boolean {
		const nodes = this.getNodes().getElementsAsArray();
		const visited = new Set<GraphNode<T>>();
		this.dfs(nodes[0], visited);
		return visited.size === nodes.length;
	}

	isCyclic(): boolean {
		const nodes = this.getNodes().getElementsAsArray();
		const visited = new Set<GraphNode<T>>();
		const recStack = new Set<GraphNode<T>>();
		for (const node of nodes) {
			if (this.isCyclicUtil(node, visited, recStack)) {
				return true;
			}
		}

		return false;
	}

	depthFirstSearch(foundIndicator: (n: GraphNode<T>) => boolean): Optional<GraphNode<T>> {
		const nodes = this.getNodes().getElementsAsArray();
		const visited = new Set<GraphNode<T>>();
		for (const node of nodes) {
			const result = this.dfsUtil(node, visited, foundIndicator);
			if (result.isSome()) {
				return result;
			}
		}

		return new None<GraphNode<T>>();
	}

	depthFirstSearchAll(foundIndicator: (n: GraphNode<T>) => boolean): MonadicSet<GraphNode<T>> {
		const nodes = this.getNodes().getElementsAsArray();
		const visited = new Set<GraphNode<T>>();
		let results = new MonadicSet<GraphNode<T>>();
		for (const node of nodes) {
			results = results.union(this.dfsUtilAll(node, visited, foundIndicator));
		}

		return results;
	}

	breadthFirstSearch(foundIndicator: (n: GraphNode<T>) => boolean): Optional<GraphNode<T>> {
		const nodes = this.getNodes().getElementsAsArray();
		const visited = new Set<GraphNode<T>>();
		for (const node of nodes) {
			const result = this.bfsUtil(node, visited, foundIndicator);
			if (result.isSome()) {
				return result;
			}
		}

		return new None<GraphNode<T>>();
	}

	breadthFirstSearchAll(foundIndicator: (n: GraphNode<T>) => boolean): MonadicSet<GraphNode<T>> {
		const nodes = this.getNodes().getElementsAsArray();
		const visited = new Set<GraphNode<T>>();
		let results = new MonadicSet<GraphNode<T>>();
		for (const node of nodes) {
			results = results.union(this.bfsUtilAll(node, visited, foundIndicator));
		}

		return results;
	}

	getSpanningTree(): Either<GraphIsNotConnectedError, Graph<T>> {
		if (!this.isConnected()) {
			return new Left<GraphIsNotConnectedError, Graph<T>>(new GraphIsNotConnectedError());
		}

		const nodesWithoutIncomingEdges = this.filterToNodesWithNoOfEdges(
			'incoming',
			this.getEdges().getElementsAsArray(),
			0,
			0,
		);
		const startingNode
            = nodesWithoutIncomingEdges.length > 0 ? nodesWithoutIncomingEdges[0] : this.getNodes().getElementsAsArray()[0];

		const visited = new Set<GraphNode<T>>();
		const edges: Array<[GraphNode<T>, GraphNode<T>]> = [];
		const queue: Array<GraphNode<T>> = [startingNode];
		while (queue.length > 0) {
			const currentNode = queue.shift()!;
			if (!visited.has(currentNode)) {
				visited.add(currentNode);
				const neighbors = this.getNeighbors(currentNode);
				const neighborsArray = neighbors.getElementsAsArray();
				for (const element of neighborsArray) {
					edges.push([currentNode, element]);
					queue.push(element);
				}
			}
		}

		const treeGraph: Graph<T> = new AdjacencyMatrixGraph<T>();
		for (const edge of edges) {
			treeGraph.addEdge(edge[0], edge[1]);
		}

		return new Right<GraphIsNotConnectedError, Graph<T>>(treeGraph);
	}

	hasCycles(): boolean {
		return this.edgesArrayHasCycle(this.getEdges().getElementsAsArray());
	}

	protected findNodeOrError(node: GraphNode<T> | string, message = 'Node does not exist in graph.'): Either<Error, GraphNode<T>> {
		const foundNode = optionalFromValue<GraphNode<T>>(typeof node === 'string' ? this.nodeMap.get(this.nodeIndexMap.get(node)!) : undefined);
		return optionalToEither<GraphNode<T>, Error>(foundNode, new Error(message));
	}

	protected findNodeOrAddOrError(node: GraphNode<T> | string, message = 'Node does not exist in graph.'): Either<Error, GraphNode<T>> {
		let foundNode: Optional<GraphNode<T>>;
		if (node instanceof GraphNode && !this.nodes.has(node)) {
			this.addNode(node);
			foundNode = new Some<GraphNode<T>>(node);
		} else {
			foundNode = optionalFromValue<GraphNode<T>>(typeof node === 'string' ? this.nodeMap.get(this.nodeIndexMap.get(node)!) : undefined);
		}

		return optionalToEither<GraphNode<T>, Error>(foundNode, new Error(message));
	}

	private isCyclicUtil(node: GraphNode<T>, visited: Set<GraphNode<T>>, recStack: Set<GraphNode<T>>): boolean {
		if (!visited.has(node)) {
			visited.add(node);
			recStack.add(node);
			const neighbors = this.getNeighbors(node);
			const neighborsArray = neighbors.getElementsAsArray();
			for (const element of neighborsArray) {
				if (!visited.has(element) && this.isCyclicUtil(element, visited, recStack)) {
					return true;
				}

				if (recStack.has(element)) {
					return true;
				}
			}
		}

		recStack.delete(node);
		return false;
	}

	private dfsUtil(node: GraphNode<T>, visited: Set<GraphNode<T>>, foundIndicator: (n: GraphNode<T>) => boolean): Optional<GraphNode<T>> {
		if (!visited.has(node)) {
			visited.add(node);
			if (foundIndicator(node)) {
				return new Some<GraphNode<T>>(node);
			}

			const neighbors = this.getNeighbors(node);
			const neighborsArray = neighbors.getElementsAsArray();
			for (const element of neighborsArray) {
				const result = this.dfsUtil(element, visited, foundIndicator);
				if (result.isSome()) {
					return result;
				}
			}
		}

		return new None<GraphNode<T>>();
	}

	private dfsUtilAll(node: GraphNode<T>, visited: Set<GraphNode<T>>, foundIndicator: (n: GraphNode<T>) => boolean): MonadicSet<GraphNode<T>> {
		if (!visited.has(node)) {
			visited.add(node);
			let results = new MonadicSet<GraphNode<T>>();
			if (foundIndicator(node)) {
				results = results.add(node);
			}

			const neighbors = this.getNeighbors(node);
			const neighborsArray = neighbors.getElementsAsArray();
			for (const element of neighborsArray) {
				results = results.union(this.dfsUtilAll(element, visited, foundIndicator));
			}

			return results;
		}

		return new MonadicSet<GraphNode<T>>();
	}

	private bfsUtil(node: GraphNode<T>, visited: Set<GraphNode<T>>, foundIndicator: (n: GraphNode<T>) => boolean): Optional<GraphNode<T>> {
		const queue: Array<GraphNode<T>> = [node];
		while (queue.length > 0) {
			const currentNode = queue.shift()!;
			if (!visited.has(currentNode)) {
				visited.add(currentNode);
				if (foundIndicator(currentNode)) {
					return new Some<GraphNode<T>>(currentNode);
				}

				const neighbors = this.getNeighbors(currentNode);
				const neighborsArray = neighbors.getElementsAsArray();
				for (const element of neighborsArray) {
					queue.push(element);
				}
			}
		}

		return new None<GraphNode<T>>();
	}

	private edgesArrayHasCycle(edges: Array<[GraphNode<T>, GraphNode<T>]>): boolean {
		const nodeNames = new Array<string>();
		for (const edge of edges) {
			if (nodeNames.includes(edge[0].name) && nodeNames.includes(edge[1].name)) {
				return true;
			}

			nodeNames.push(edge[0].name, edge[1].name);
		}

		return false;
	}

	private filterToNodesWithNoOfEdges(
		inOrOut: 'incoming' | 'outgoing',
		edges: Array<[GraphNode<T>, GraphNode<T>]>,
		minNo = 1,
		maxNo = 1,
	): Array<GraphNode<T>> {
		if (maxNo !== Number.POSITIVE_INFINITY || minNo > maxNo) {
			throw new Error('minNo must be less than or equal to maxNo.');
		}

		if (minNo < 0 || maxNo < 0) {
			throw new Error('minNo and maxNo must be greater than or equal to 0.');
		}

		const filterFn = (_: GraphNode<T>, count: number): boolean => {
			if (count < minNo || (maxNo !== Number.POSITIVE_INFINITY && count > maxNo)) {
				return false;
			}

			return true;
		};

		const nodesWithIncomingEdges = new Map<string, [GraphNode<T>, number]>();
		for (const edge of edges) {
			const targetNode = inOrOut === 'incoming' ? edge[1] : edge[0];
			const targetNodeName = targetNode.name;
			if (nodesWithIncomingEdges.has(targetNodeName)) {
				const existingEntry = nodesWithIncomingEdges.get(targetNodeName)!;
				const currentIncomingEdgeCount = existingEntry[1];
				nodesWithIncomingEdges.set(targetNodeName, [targetNode, currentIncomingEdgeCount + 1]);
			} else {
				nodesWithIncomingEdges.set(targetNodeName, [targetNode, 1]);
			}
		}

		const nodesArray = Array.from(nodesWithIncomingEdges.values());
		return nodesArray.filter(t => filterFn(t[0], t[1])).map(t => t[0]);
	}

	private bfsUtilAll(node: GraphNode<T>, visited: Set<GraphNode<T>>, foundIndicator: (n: GraphNode<T>) => boolean): MonadicSet<GraphNode<T>> {
		const queue: Array<GraphNode<T>> = [node];
		let results = new MonadicSet<GraphNode<T>>();
		while (queue.length > 0) {
			const currentNode = queue.shift()!;
			if (!visited.has(currentNode)) {
				visited.add(currentNode);
				if (foundIndicator(currentNode)) {
					results = results.add(currentNode);
				}

				const neighbors = this.getNeighbors(currentNode);
				const neighborsArray = neighbors.getElementsAsArray();
				for (const element of neighborsArray) {
					queue.push(element);
				}
			}
		}

		return results;
	}

	private dfs(node: GraphNode<T>, visited: Set<GraphNode<T>>): void {
		// Iterative DFS (recursive DFS threatens to blow the stack)
		const stack: Array<GraphNode<T>> = [node];
		while (stack.length > 0) {
			const currentNode = stack.pop()!;
			if (!visited.has(currentNode)) {
				visited.add(currentNode);
				const neighbors = this.getNeighbors(currentNode);
				const neighborsArray = neighbors.getElementsAsArray();
				for (const element of neighborsArray) {
					stack.push(element);
				}
			}
		}
	}
}


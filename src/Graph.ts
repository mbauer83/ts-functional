import { MonadicSet } from "./MonadicSet";
import { Tree } from "./Tree";
import { Either, Left, Right }  from "./Either";
import { List } from "./List";
import { Predicate } from "./Predicate";

class GraphIsNotConnectedError extends Error {
    constructor() {
        super("Graph is not connected.");
    }
}

class GraphNode<T> {
    constructor(public readonly name: string, public readonly payload: T) {}
}

interface Graph<T> {
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
    depthFirstSearch(foundIndicator: (node: GraphNode<T>) => boolean): GraphNode<T> | null;
    depthFirstSearchAll(foundIndicator: (node: GraphNode<T>) => boolean): MonadicSet<GraphNode<T>>;
    breadthFirstSearch(foundIndicator: (node: GraphNode<T>) => boolean): GraphNode<T> | null;
    breadthFirstSearchAll(foundIndicator: (node: GraphNode<T>) => boolean): MonadicSet<GraphNode<T>>;
    getSpanningTree(): Either<GraphIsNotConnectedError, Graph<T>>;
}

class AdjacencyMatrixGraph<T> {
    private nodes: MonadicSet<GraphNode<T>> = new MonadicSet();
    private edges: MonadicSet<[GraphNode<T>, GraphNode<T>]> = new MonadicSet();
    private adjacencyMatrix: boolean[][] = [];
    private nodeIndexMap: Map<string, number> = new Map();
    private nodeMap: Map<number, GraphNode<T>> = new Map();

    protected findNodeOrError(node: GraphNode<T>|string, msg: string = 'Node does not exist in graph.'): GraphNode<T> {
        let foundNode: GraphNode<T> | null = null;
        if (typeof node === "string") {
            foundNode = this.nodeMap.get(this.nodeIndexMap.get(node) as number) ?? null;
        }
        if (null === foundNode || !this.nodes.has(foundNode)) {
            throw new Error(msg);
        }
        return foundNode;
    }

    protected findNodeOrAddOrError(node: GraphNode<T>|string, msg: string = 'Node does not exist in graph.'): GraphNode<T> {
        let foundNode: GraphNode<T> | null = null;
        if (node instanceof GraphNode && !this.nodes.has(node)) {
            this.addNode(node);
            foundNode = node;
        } else if (typeof node === "string") {
            foundNode = this.nodeMap.get(this.nodeIndexMap.get(node) as number) ?? null;
        }

        if (null === foundNode) {
            throw new Error(msg);
        }
        return foundNode;
    }

    addNode(node: GraphNode<T>): void {
        if (this.nodes.has(node)) {
            throw new Error("Node already exists");
        }
        this.nodes.add(node);
        const size = this.nodes.getSize() - 1;
        this.nodeIndexMap.set(node.name, size);
        this.nodeMap.set(size, node);
        this.adjacencyMatrix.push(new Array(size).fill(false));
        for (let i = 0; i < this.adjacencyMatrix.length - 1; i++) {
            this.adjacencyMatrix[i].push(false);
        }
    }

    removeNode(node: GraphNode<T>): void;
    removeNode(nodeName: string): void;
    removeNode(node: GraphNode<T> | string): void {
        if (node instanceof GraphNode && !this.nodes.has(node)) {
            return;
        }
        const graphNode: GraphNode<T> = this.findNodeOrError(node);
        const index = this.nodeIndexMap.get(graphNode.name) as number;
        this.nodes = this.nodes.delete(graphNode);
        this.nodeIndexMap.delete(graphNode.name);
        this.nodeMap.delete(index);
        this.adjacencyMatrix.splice(index, 1);
        for (let i = 0; i < this.adjacencyMatrix.length; i++) {
            this.adjacencyMatrix[i].splice(index, 1);
        }
        this.edges = this.edges.filter(new Predicate(([from, to]) => from !== graphNode && to !== graphNode));
    }

    addEdge(from: GraphNode<T>, to: GraphNode<T>): void;
    addEdge(from: string, to: string): void;
    addEdge(from: GraphNode<T> | string, to: GraphNode<T> | string): void {
        const graphNodeFrom: GraphNode<T> = this.findNodeOrError(from, '`from` node does not exist in graph.');
        let graphNodeTo: GraphNode<T> = this.findNodeOrError(to, '`to` node does not exist in graph.');
        const fromIndex = this.nodeIndexMap.get(graphNodeFrom.name) as number;
        const toIndex = this.nodeIndexMap.get(graphNodeTo.name) as number;
        this.adjacencyMatrix[fromIndex][toIndex] = true;
        this.edges.add([graphNodeFrom, graphNodeTo]);
    }

    removeEdge(from: GraphNode<T>, to: GraphNode<T>): void;
    removeEdge(from: string, to: string): void;
    removeEdge(from: GraphNode<T> | string, to: GraphNode<T> | string): void {
        const graphNodeFrom: GraphNode<T> = this.findNodeOrError(from, '`from` node does not exist in graph.');
        const graphNodeTo: GraphNode<T> = this.findNodeOrError(to, '`to` node does not exist in graph.');
        const fromIndex = this.nodeIndexMap.get(graphNodeFrom.name) as number;
        const toIndex = this.nodeIndexMap.get(graphNodeTo.name) as number;
        this.adjacencyMatrix[fromIndex][toIndex] = false;
        this.edges = this.edges.delete([graphNodeFrom, graphNodeTo]);
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
        const graphNode: GraphNode<T> = this.findNodeOrError(node);
        const index = this.nodeIndexMap.get(graphNode.name) as number;
        let neighbors = new MonadicSet<GraphNode<T>>();
        for (let i = 0; i < this.adjacencyMatrix[index].length; i++) {
            if (this.adjacencyMatrix[index][i]) {
                neighbors = neighbors.add(this.nodeMap.get(i) as GraphNode<T>);
            }
        }
        return neighbors;
    }

    isConnected(): boolean {
        const nodes = this.getNodes().getElementsAsArray();
        const visited: Set<GraphNode<T>> = new Set();
        this.dfs(nodes[0], visited);
        return visited.size === nodes.length;
    }

    private dfs(node: GraphNode<T>, visited: Set<GraphNode<T>>): void {
        // Iterative DFS (recursive DFS threatens to blow the stack)
        const stack: GraphNode<T>[] = [node];
        while (stack.length > 0) {
            const currentNode = stack.pop() as GraphNode<T>;
            if (!visited.has(currentNode)) {
                visited.add(currentNode);
                const neighbors = this.getNeighbors(currentNode);
                const neighborsArray = neighbors.getElementsAsArray();
                for (let i = 0; i < neighborsArray.length; i++) {
                    stack.push(neighborsArray[i]);
                }
            }
        }
    }

    isCyclic(): boolean {
        const nodes = this.getNodes().getElementsAsArray();
        const visited: Set<GraphNode<T>> = new Set();
        const recStack: Set<GraphNode<T>> = new Set();
        for (let i = 0; i < nodes.length; i++) {
            if (this.isCyclicUtil(nodes[i], visited, recStack)) {
                return true;
            }
        }
        return false;
    }

    private isCyclicUtil(node: GraphNode<T>, visited: Set<GraphNode<T>>, recStack: Set<GraphNode<T>>): boolean {
        if (!visited.has(node)) {
            visited.add(node);
            recStack.add(node);
            const neighbors = this.getNeighbors(node);
            const neighborsArray = neighbors.getElementsAsArray();
            for (let i = 0; i < neighborsArray.length; i++) {
                if (!visited.has(neighborsArray[i]) && this.isCyclicUtil(neighborsArray[i], visited, recStack)) {
                    return true;
                } else if (recStack.has(neighborsArray[i])) {
                    return true;
                }
            }
        }
        recStack.delete(node);
        return false;
    }

    depthFirstSearch(foundIndicator: (n: GraphNode<T>) => boolean): GraphNode<T> | null {
        const nodes = this.getNodes().getElementsAsArray();
        const visited: Set<GraphNode<T>> = new Set();
        for (let i = 0; i < nodes.length; i++) {
            const result = this.dfsUtil(nodes[i], visited, foundIndicator);
            if (result) {
                return result;
            }
        }
        return null;
    }

    private dfsUtil(node: GraphNode<T>, visited: Set<GraphNode<T>>, foundIndicator: (n: GraphNode<T>) => boolean): GraphNode<T> | null {
        if (!visited.has(node)) {
            visited.add(node);
            if (foundIndicator(node)) {
                return node;
            }
            const neighbors = this.getNeighbors(node);
            const neighborsArray = neighbors.getElementsAsArray();
            for (let i = 0; i < neighborsArray.length; i++) {
                const result = this.dfsUtil(neighborsArray[i], visited, foundIndicator);
                if (result) {
                    return result;
                }
            }
        }
        return null;
    }

    depthFirstSearchAll(foundIndicator: (n: GraphNode<T>) => boolean): MonadicSet<GraphNode<T>> {
        const nodes = this.getNodes().getElementsAsArray();
        const visited: Set<GraphNode<T>> = new Set();
        let results = new MonadicSet<GraphNode<T>>();
        for (let i = 0; i < nodes.length; i++) {
            results = results.union(this.dfsUtilAll(nodes[i], visited, foundIndicator));
        }
        return results;
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
            for (let i = 0; i < neighborsArray.length; i++) {
                results = results.union(this.dfsUtilAll(neighborsArray[i], visited, foundIndicator));
            }
            return results;
        }
        return new MonadicSet<GraphNode<T>>();
    }

    breadthFirstSearch(foundIndicator: (n: GraphNode<T>) => boolean): GraphNode<T> | null {
        const nodes = this.getNodes().getElementsAsArray();
        const visited: Set<GraphNode<T>> = new Set();
        for (let i = 0; i < nodes.length; i++) {
            const result = this.bfsUtil(nodes[i], visited, foundIndicator);
            if (result) {
                return result;
            }
        }
        return null;
    }

    private bfsUtil(node: GraphNode<T>, visited: Set<GraphNode<T>>, foundIndicator: (n: GraphNode<T>) => boolean): GraphNode<T> | null {
        const queue: GraphNode<T>[] = [node];
        while (queue.length > 0) {
            const currentNode = queue.shift() as GraphNode<T>;
            if (!visited.has(currentNode)) {
                visited.add(currentNode);
                if (foundIndicator(currentNode)) {
                    return currentNode;
                }
                const neighbors = this.getNeighbors(currentNode);
                const neighborsArray = neighbors.getElementsAsArray();
                for (let i = 0; i < neighborsArray.length; i++) {
                    queue.push(neighborsArray[i]);
                }
            }
        }
        return null;
    }

    breadthFirstSearchAll(foundIndicator: (n: GraphNode<T>) => boolean): MonadicSet<GraphNode<T>> {
        const nodes = this.getNodes().getElementsAsArray();
        const visited: Set<GraphNode<T>> = new Set();
        let results = new MonadicSet<GraphNode<T>>();
        for (let i = 0; i < nodes.length; i++) {
            results = results.union(this.bfsUtilAll(nodes[i], visited, foundIndicator));
        }
        return results;
    }

    private bfsUtilAll(node: GraphNode<T>, visited: Set<GraphNode<T>>, foundIndicator: (n: GraphNode<T>) => boolean): MonadicSet<GraphNode<T>> {
        const queue: GraphNode<T>[] = [node];
        let results = new MonadicSet<GraphNode<T>>();
        while (queue.length > 0) {
            const currentNode = queue.shift() as GraphNode<T>;
            if (!visited.has(currentNode)) {
                visited.add(currentNode);
                if (foundIndicator(currentNode)) {
                    results = results.add(currentNode);
                }
                const neighbors = this.getNeighbors(currentNode);
                const neighborsArray = neighbors.getElementsAsArray();
                for (let i = 0; i < neighborsArray.length; i++) {
                    queue.push(neighborsArray[i]);
                }
            }
        }
        return results;
    }

    getSpanningTree(): Either<GraphIsNotConnectedError, Graph<T>> {
        if (!this.isConnected()) {
            return new Left(new Error("Graph is not connected."));
        }
        const nodesWithoutIncomingEdges = this.filterToNodesWithNoOfEdges(
            "incoming", 
            this.getEdges().getElementsAsArray(), 
            0, 
            0
        );
        const startingNode = 
            nodesWithoutIncomingEdges.length > 0 ? 
                nodesWithoutIncomingEdges[0] : 
                this.getNodes().getElementsAsArray()[0];


        const visited: Set<GraphNode<T>> = new Set();
        const edges: [GraphNode<T>, GraphNode<T>][] = [];
        const queue: GraphNode<T>[] = [startingNode];
        while (queue.length > 0) {
            const currentNode = queue.shift() as GraphNode<T>;
            if (!visited.has(currentNode)) {
                visited.add(currentNode);
                const neighbors = this.getNeighbors(currentNode);
                const neighborsArray = neighbors.getElementsAsArray();
                for (let i = 0; i < neighborsArray.length; i++) {
                    edges.push([currentNode, neighborsArray[i]]);
                    queue.push(neighborsArray[i]);
                }
            }
        }
        const treeGraph: Graph<T> = new AdjacencyMatrixGraph<T>();
        for (const edge of edges) {
            treeGraph.addEdge(edge[0], edge[1]);
        }
        return new Right(treeGraph);
    }

    private edgesArrayHasCycle(edges: [GraphNode<T>, GraphNode<T>][]): boolean {
        const nodeNames = new Array<string>();
        for (const edge of edges) {
            if (nodeNames.includes(edge[0].name) && nodeNames.includes(edge[1].name)) {
                return true;
            }
            nodeNames.push(edge[0].name);
            nodeNames.push(edge[1].name);
        }
        return false;
    }

    hasCycles(): boolean {
        return this.edgesArrayHasCycle(this.getEdges().getElementsAsArray());
    }

    
    private filterToNodesWithNoOfEdges(
        inOrOut: "incoming"|"outgoing", 
        edges: [GraphNode<T>, GraphNode<T>][],
        minNo: number = 1, 
        maxNo: number = 1
    ): GraphNode<T>[] {
        if (maxNo !== Infinity|| minNo > maxNo) {
            throw new Error("minNo must be less than or equal to maxNo.");
        }
        if (minNo < 0 || maxNo < 0) {
            throw new Error("minNo and maxNo must be greater than or equal to 0.");
        }
        const filterFn = (_: GraphNode<T>, count: number): boolean => {
            if (count < minNo || (maxNo !== Infinity && count > maxNo)) {
                return false;
            }
            return true;
        }
        const nodesWithIncomingEdges = new Map<string, [GraphNode<T>, number]>();
        for (const edge of edges) {
            const targetNode = inOrOut === "incoming" ? edge[1] : edge[0];
            const targetNodeName = targetNode.name;
            if (!nodesWithIncomingEdges.has(targetNodeName)) {
                nodesWithIncomingEdges.set(targetNodeName, [targetNode, 1]);
            } else {
                const existingEntry = nodesWithIncomingEdges.get(targetNodeName)!;
                const currentIncomingEdgeCount = existingEntry[1];
                nodesWithIncomingEdges.set(targetNodeName, [targetNode, currentIncomingEdgeCount + 1]);
            }
        }
        const nodesArray = Array.from(nodesWithIncomingEdges.values())
        return nodesArray.filter((t) => filterFn(t[0], t[1])).map((t) => t[0]);
    }
    

}


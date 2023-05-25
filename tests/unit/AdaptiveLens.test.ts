/* eslint-disable */

import { AdaptiveLens } from '../../src/AdaptiveLens.js';

type NameExtended = { firstName: string, lastName: string };
type StreetExtended = { name: string, no: string };
type Address = { street: string, city: string };
type AddressExtended = { street: StreetExtended, city: string };

describe('AdaptiveLens', () => {
  interface Person {
    name: string;
    age: number;
    address: {
      street: string;
      city: string;
    }
  }

  interface PersonUpdate {
    name: NameExtended
    age?: number;
    address?: {
      street: StreetExtended,
      city: string;
    }
  }

  type PersonWithNameUpdate = Omit<Person, 'name'> & Record<'name', NameExtended>;
  type PersonWithAddressUpdate = Omit<Person, 'address'> & Record<'address', { street: StreetExtended, city: string}>;
  const nameLens = AdaptiveLens.forProperty<Person, NameExtended>()('name');
  const ageLens = AdaptiveLens.forProperty<Person, number>()('age');
  const addressLens = AdaptiveLens.forProperty<Person, AddressExtended>()('address');
  const streetLens = addressLens.compose(AdaptiveLens.forProperty<Person['address'], StreetExtended>()('street'));

  const person: Person = {
    name: 'John',
    age: 30,
    address: {
      street: '123 Main St',
      city: 'Anytown',
    },
  };

  test('should get the correct value', () => {
    expect(nameLens.get(person)).toBe('John');
    expect(ageLens.get(person)).toBe(30);
    expect(streetLens.get(person)).toBe('123 Main St');
  });

  test('should update the correct value', () => {
    const newName = { firstName: 'Jane', lastName: 'Doe' };
    const nameUpdatedPerson = nameLens.update(person, newName);
    expect(nameUpdatedPerson.name).toBe(newName);

    const updatedPerson2 = ageLens.update(person, 31);
    expect(updatedPerson2.age).toBe(31);

    const streetExtended = { name: 'Elm St', no: '456' };
    const addressUpdatedPerson = streetLens.update(person, streetExtended);
    expect(addressUpdatedPerson.address.street).toBe(streetExtended);
  });

  test('should compose lenses', () => {
    const newName = { firstName: 'Jane', lastName: 'Doe' };
    const nameUpdatedPerson = nameLens.update(person, newName);
    const personNameExtendedLens = AdaptiveLens.forProperty<PersonWithNameUpdate, NameExtended>()('name');
    const nameExtendedFirstNameLens = AdaptiveLens.forProperty<NameExtended, string>()('firstName');
    const personFirstNameLens = personNameExtendedLens.compose(nameExtendedFirstNameLens);

    expect(personFirstNameLens.get(nameUpdatedPerson)).toBe('Jane');
    const firstNameUpdatedPerson = personFirstNameLens.update(nameUpdatedPerson, 'Joanna');
    expect(firstNameUpdatedPerson.name.firstName).toBe('Joanna');
  });

  test('lens for multiple properties has correct getter', () => {
    const nameAgeLens = AdaptiveLens.forProperties<Person, ['name', 'age']>()(['name', 'age']);
    const expectNameAndAge = [person.name, person.age];
    expect(nameAgeLens.get(person)).toEqual(expectNameAndAge);
  });

  test('lens for multiple properties has correct setter', () => {
    const nameAgeLens = AdaptiveLens.forProperties<Person, Record<'name', string> & Record<'age', number>>()(['name', 'age']);
    const newNameAndAge = { name: 'Rick', age: 70};
    const newNameAndAgeTuple = [newNameAndAge.name, newNameAndAge.age];
    const updatedPerson = nameAgeLens.update(person, newNameAndAge);
    expect(nameAgeLens.get(updatedPerson)).toEqual(newNameAndAgeTuple);
  });
});

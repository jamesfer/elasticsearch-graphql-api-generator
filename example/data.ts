import { random, sample } from "lodash";

export interface Property {
  id: string;
  streetNumber: string;
  streetName: string;
  streetType: string;
  suburb: string;
  postcode: string;
  yearBuilt: number;
  avmPrice: number;
  bedrooms: number;
  bathrooms: number;
  carSpaces: number;
}

function makeData(): Property[] {
  return Array(1000).fill(0).map(() => ({
    id: `${random(1000000, 9999999)}`,
    streetNumber: `${random(1, 99)}`,
    streetName: sample(['Gilbert', 'High', 'River', 'Snow', 'Alpine', 'Briggan', 'Newline', 'Neu', 'Haste', 'Marshal', 'Lookout', 'Disk', 'Reaven', 'Young', 'Treant'])!,
    streetType: sample(['Street', 'Avenue', 'Road', 'Crescent', 'Way', 'Highway'])!,
    suburb: sample(['Kew', 'Hawthorn', 'Richmond', 'East Richmond', 'Melbourne', 'Footscray', 'Abbotsford', 'Cremone', 'Toorak', 'Malvern'])!,
    postcode: `${random(3000, 3500)}`,
    yearBuilt: random(1950, 2020),
    avmPrice: random(300000, 2000000),
    bedrooms: random(1, 5),
    bathrooms: random(1, 3),
    carSpaces: random(0, 3),
  }));
}

console.log(JSON.stringify(makeData(), undefined, 2));

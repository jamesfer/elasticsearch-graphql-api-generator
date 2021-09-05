export interface FilterArg {
  cond?: { [k: string]: any };
  and?: FilterArg[];
  or?: FilterArg[];
}

export interface DatasetArguments {
  filter?: FilterArg;
  order?: { [k: string]: any }[];
}


import {
  bits,
  blob,
  Blob,
  offset as _offset,
  seq as _seq,
  Structure as _Structure,
  u32 as _u32,
  u8 as _u8,
  UInt,
  union as _union,
  Union as _Union,
} from "./buffer-layout";

export interface Layout<T = any, P = ""> {
  span: number;
  property?: P;
  decode(b: Buffer, offset?: number): T;
  encode(src: T, b: Buffer, offset?: number): number;
  getSpan(b: Buffer, offset?: number): number;
  replicate<AP extends string>(name: AP): Layout<T, AP>;
}

export class Structure<T, P, D extends { [key: string]: any; }> extends _Structure<T, P, D> {
  /** @override */
  decode(b: Buffer, offset?: number): D {
    return super.decode(b, offset);
  }
}

export function struct<T, P extends string = "">(
  fields: T,
  property?: P,
  decodePrefixes?: boolean,
): T extends Layout<infer Value, infer Property>[]
  ? Structure<
    Value,
    P,
    {
      [K in Exclude<Extract<Property, string>, "">]: Extract<T[number], Layout<any, K>> extends Layout<infer V, any>
      ? V
      : any;
    }
  >
  : any {
  //@ts-expect-error this type is not quite satisfied the define, but, never no need to worry about.
  return new Structure(fields, property, decodePrefixes);
}
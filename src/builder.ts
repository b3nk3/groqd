import { z } from "zod";
import { grab } from "./grab";
import { select, spreadUnionSchema } from "./select";
import type {
  ConditionRecord,
  ZodUnionAny,
  SelectSchemaType,
  Spread,
} from "./select";
import type { Selection } from "./types";
import { extendsBaseQuery } from "./typeGuards";
import {
  nullToUndefined,
  nullToUndefinedOnConditionalSelection,
} from "./nullToUndefined";
import { Payload, BaseQuery } from "./baseQuery";

/**
 * Single Entity
 */
export class EntityQuery<T extends z.ZodTypeAny> extends BaseQuery<T> {
  constructor(payload: Payload<T>) {
    super(payload);
  }

  select<Conditions extends ConditionRecord>(
    s: Conditions
  ): EntityQuery<Spread<SelectSchemaType<Conditions>>>;
  select<S extends ZodUnionAny>(s: BaseQuery<S>): EntityQuery<Spread<S>>;
  select<Conditions extends ConditionRecord>(
    s: Conditions
  ): EntityQuery<Spread<SelectSchemaType<Conditions>>> {
    const _select = extendsBaseQuery(s) ? s : select(s);

    return new EntityQuery<Spread<SelectSchemaType<Conditions>>>({
      query: this.query + `{...${_select.query}}`,
      schema: spreadUnionSchema(_select.schema),
    });
  }

  grab<
    S extends Selection,
    CondSelections extends Record<string, Selection> | undefined
  >(selection: S, conditionalSelections?: CondSelections) {
    return grab(this.query, this.schema, selection, conditionalSelections);
  }

  grab$<
    S extends Selection,
    CondSelections extends Record<string, Selection> | undefined
  >(selection: S, conditionalSelections?: CondSelections) {
    return grab(
      this.query,
      this.schema,
      nullToUndefined(selection),
      conditionalSelections
        ? nullToUndefinedOnConditionalSelection(conditionalSelections)
        : conditionalSelections
    );
  }

  grabOne<GrabOneType extends z.ZodType>(
    name: string,
    fieldSchema: GrabOneType
  ) {
    return new EntityQuery<GrabOneType>({
      query: this.query + `.${name}`,
      schema: fieldSchema,
    });
  }

  grabOne$<GrabOneType extends z.ZodType>(
    name: string,
    fieldSchema: GrabOneType
  ) {
    return new EntityQuery<z.ZodEffects<GrabOneType>>({
      query: this.query + `.${name}`,
      schema: nullToUndefined(fieldSchema),
    });
  }
}

/**
 * Unknown, comes out of pipe and is starting point for queries.
 */
export class UnknownQuery extends EntityQuery<z.ZodUnknown> {
  constructor(payload: Pick<Payload<z.ZodUnknown>, "query">) {
    super({ ...payload, schema: z.unknown() });
  }

  // filter to an unknown array
  filter(filterValue = ""): UnknownArrayQuery {
    this.query += `[${filterValue}]`;
    return new UnknownArrayQuery({
      ...this.value(),
    });
  }

  deref() {
    this.query += "->";
    return this;
  }
}

/**
 * Array
 */
export class ArrayQuery<T extends z.ZodTypeAny> extends BaseQuery<
  z.ZodArray<T>
> {
  constructor(payload: Payload<z.ZodArray<T>>) {
    super(payload);
  }

  select<Conditions extends ConditionRecord>(
    s: Conditions
  ): ArrayQuery<Spread<SelectSchemaType<Conditions>>>;
  select<S extends ZodUnionAny>(s: BaseQuery<S>): ArrayQuery<Spread<S>>;
  select<Conditions extends ConditionRecord>(
    s: Conditions
  ): ArrayQuery<Spread<SelectSchemaType<Conditions>>> {
    const _select = extendsBaseQuery(s) ? s : select(s);

    return new ArrayQuery<Spread<SelectSchemaType<Conditions>>>({
      query: this.query + `{...${_select.query}}`,
      schema: z.array(spreadUnionSchema(_select.schema)),
    });
  }

  filter(filterValue = "") {
    this.query += `[${filterValue}]`;
    return this;
  }

  grab<
    S extends Selection,
    CondSelections extends Record<string, Selection> | undefined
  >(selection: S, conditionalSelections?: CondSelections) {
    return grab(this.query, this.schema, selection, conditionalSelections);
  }

  grab$<
    S extends Selection,
    CondSelections extends Record<string, Selection> | undefined
  >(selection: S, conditionalSelections?: CondSelections) {
    return grab(
      this.query,
      this.schema,
      nullToUndefined(selection),
      conditionalSelections
        ? nullToUndefinedOnConditionalSelection(conditionalSelections)
        : conditionalSelections
    );
  }

  grabOne<GrabOneType extends z.ZodType>(
    name: string,
    fieldSchema: GrabOneType
  ) {
    return new ArrayQuery<GrabOneType>({
      query: this.query + `.${name}`,
      schema: z.array(fieldSchema),
    });
  }

  grabOne$<GrabOneType extends z.ZodType>(
    name: string,
    fieldSchema: GrabOneType
  ) {
    return new ArrayQuery<z.ZodEffects<GrabOneType>>({
      query: this.query + `.${name}`,
      schema: z.array(nullToUndefined(fieldSchema)),
    });
  }

  order(...orderings: `${string} ${"asc" | "desc"}`[]): ArrayQuery<T> {
    this.query += `|order(${orderings.join(", ")})`;
    return this;
  }

  score(...scores: string[]): ArrayQuery<T> {
    this.query += `|score(${scores.join(", ")})`;
    return this;
  }

  // Slicing
  slice(index: number): EntityQuery<T>;
  slice(min: number, max: number): ArrayQuery<T>;
  slice(min: number, max?: number): EntityQuery<T> | ArrayQuery<T> {
    this.query += `[${min}${typeof max === "number" ? `..${max}` : ""}]`;

    if (typeof max === "undefined") {
      return new EntityQuery({
        ...this.value(),
        schema: this.schema.element,
      });
    }

    return this;
  }
}

export class UnknownArrayQuery extends ArrayQuery<z.ZodUnknown> {
  constructor(payload: Pick<Payload<z.ZodArray<z.ZodUnknown>>, "query">) {
    super({ ...payload, schema: z.array(z.unknown()) });
  }

  deref() {
    this.query += "->";
    return this;
  }
}

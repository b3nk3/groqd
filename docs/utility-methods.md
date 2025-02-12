---
sidebar_position: 5
---

# Utility Methods

## `nullToUndefined`

GROQ will return `null` if you query for a value that does not exist. This can lead to confusion when writing queries, because Zod's `.optional().default("default value")` doesn't work with null values. `groqd` ships with a `nullToUndefined` method that will preprocess `null` values into `undefined` to smooth over this rough edge.

```ts
q("*")
  .filter("_type == 'pokemon'")
  .grab({
    name: q.string(),
    // 👇 Missing field, allow us to set a default value when it doesn't exist
    foo: nullToUndefined(q.string().optional().default("bar")),
  })
```

The `nullToUndefined` helper can also accept a `Selection` object to apply to an entire selection.

```ts
q("*")
  .filter("_type == 'pokemon'")
  .grab(nullToUndefined({
    name: q.string(),
    foo: q.string().optional().default("bar"),
  }))
```

:::tip
The [`.grab$`](/query-building#grab-1) and [`.grabOne$`](/query-building#grabone-1) methods use this under the hood – in most instances, we recommend you just use `.grab$` and `.grabOne$` instead of this utility.
:::

## `q.sanityImage`

A convenience method to make it easier to generate image queries for Sanity's image type. Supports fetching various info from both `image` documents and `asset` documents.

In its simplest form, it looks something like this:

```ts
q("*")
  .filter("_type == 'pokemon'")
  .grab({
    cover: q.sanityImage("cover"), // 👈 just pass the field name
  });

// -> { cover: { _key: string; _type: string; asset: { _type: "reference"; _ref: string; } } }[]
```

which will allow you to fetch the minimal/basic image document information.

### `q.sanityImage`'s `isList` option

If you have an array of image documents, you can pass `isList: true` to an options object as the second argument to `q.sanityImage` method.

```ts
q("*")
  .filter("_type == 'pokemon'")
  .grab({
    images: q.sanityImage("images", { isList: true }), // 👈 fetch as a list
  });

// -> { images: { ... }[] }[]
```

### `q.sanityImage`'s `withCrop` option

Sanity's image document has fields for crop information, which you can query for with the `withCrop` option.

```ts
q("*")
  .filter("_type == 'pokemon'")
  .grab({
    cover: q.sanityImage("cover", { withCrop: true }), // 👈 fetch crop info
  });

// -> { cover: { ..., crop: { top: number; bottom: number; left: number; right: number; } | null } }[]
```

### `q.sanityImage`'s `withHotspot` option

Sanity's image document has fields for hotspot information, which you can query for with the `withHotspot` option.

```ts
q("*")
  .filter("_type == 'pokemon'")
  .grab({
    cover: q.sanityImage("cover", { withHotpot: true }), // 👈 fetch hotspot info
  });

// -> { cover: { ..., hotspot: { x: number; y: number; height: number; width: number; } | null } }[]
```

### `q.sanityImage`'s `additionalFields` option

Sanity allows you to add additional fields to their image documents, such as alt text or descriptions. The `additionalFields` option allows you to specify such fields to query with your image query.

```ts
q("*")
  .filter("_type == 'pokemon'")
  .grab({
    cover: q.sanityImage("cover", {
      // 👇 fetch additional fields
      additionalFields: {
        alt: q.string(),
        description: q.string(),
      },
    }),
  });

// -> { cover: { ..., alt: string, description: string } }[]
```

### `q.sanityImage`'s `withAsset` option

Sanity's image documents have a reference to an asset document that contains a whole host of information relative to the uploaded image asset itself. The `q.sanityImage` will allow you to dereference this asset document and query various fields from it.

You can pass an array to the `withAsset` option to specify which fields you want to query from the asset document:

- pass `"base"` to query the base asset document fields, including `extension`, `mimeType`, `originalFilename`, `size`, `url`, and `path`.
- pass `"dimensions"` to query the asset document's `metadata.dimensions` field, useful if you need the image's original dimensions or aspect ratio.
- pass `"location"` to query the asset document's `metadata.location` field.
- pass `"lqip"` to query the asset's `metadata.lqip` (Low Quality Image Placeholder) field, useful if you need to display LQIPs.
- pass `"hasAlpha"` to query the asset's `metadata.hasAlpha` field, useful if you need to know if the image has an alpha channel.
- pass `"isOpaque"` to query the asset's `metadata.isOpaque` field, useful if you need to know if the image is opaque.
- pass `"blurHash"` to query the asset's `metadata.blurHash` field, useful if you need to display blurhashes.
- pass `"palette"` to query the asset document's `metadata.palette` field, useful if you want to use the image's color palette in your UI.

An example:

```ts
q("*")
  .filter("_type == 'pokemon'")
  .grab({
    cover: q.sanityImage("cover", {
      withAsset: ["base", "dimensions"],
    }),
  });

// -> { cover: { ..., asset: { extension: string; mimeType: string; ...; metadata: { dimensions: { aspectRatio: number; height: number; width: number; }; }; }; } }[]
```

## `makeSafeQueryRunner`


A wrapper around `q` so you can easily use `groqd` with an actual fetch implementation.

Pass `makeSafeQueryRunner` a "query executor" of the shape `type QueryExecutor = (query: string, ...rest: any[]) => Promise<any>`, and it will return a "query runner" function. This is best illustrated with an example:

```ts
import sanityClient from "@sanity/client";
import { q } from "groqd";

// Wrap sanityClient.fetch
const client = sanityClient({
  /* ... */
});
export const runQuery = makeSafeQueryRunner((query) => client.fetch(query));

// 👇 Now you can run queries and `data` is strongly-typed, and runtime-validated.
const data = await runQuery(
  q("*").filter("_type == 'pokemon'").grab({ name: q.string() }).slice(0, 150)
);
```

In Sanity workflows, you might also want to pass e.g. params to your `client.fetch` call. To support this, add additional arguments to your `makeSafeQueryRunner` argument's arguments as below.

```ts
// ...
export const runQuery = makeSafeQueryRunner(
  //      👇 add a second arg
  (query, params: Record<string, unknown> = {}) => client.fetch(query, params)
);

const data = await runQuery(
  q("*").filter("_type == 'pokemon' && _id == $id").grab({ name: q.string() }),
  { id: "pokemon.1" } // 👈 and optionally pass them here.
);
```

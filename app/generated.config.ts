import { assembleApplication } from "./src/assembly.ts";

export default {
  assemble: assembleApplication,
  title: "RunTogether",
  wireName: "RunTogetherWire",
  design: {
    version: 1,
    documents: [
      new URL("./design/types.md", import.meta.url),
      new URL("./design/compositions/RunTogether.md", import.meta.url),
    ],
  },
};
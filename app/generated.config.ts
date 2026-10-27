import { assembleApplication } from "./src/assembly.ts";
import { MemoryProvider } from "./src/concepts/Federating/provider.ts";

export default {
  assemble: () => assembleApplication({ provider: new MemoryProvider() }),
  title: "RunTogether",
  wireName: "RunTogetherWire",
  design: {
    version: 1,
    documents: [
      new URL("./design/types.md", import.meta.url),
      new URL("./design/compositions/reusable/accounts.md", import.meta.url),
      new URL("./design/compositions/reusable/passwords.md", import.meta.url),
      new URL("./design/compositions/reusable/commons.md", import.meta.url),
      new URL("./design/compositions/RunTogether.md", import.meta.url),
      new URL("./design/compositions/Notifications.md", import.meta.url),
      new URL("./design/compositions/Comments.md", import.meta.url),
      new URL("./design/compositions/Invitations.md", import.meta.url),
    ],
  },
};

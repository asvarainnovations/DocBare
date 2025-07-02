import { RunnableSequence } from "@langchain/core/runnables";
import { OpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { MongoClient } from "mongodb";
import { StringOutputParser } from "@langchain/core/output_parsers";

export async function createDocBareAgent() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  const store = new MongoDBAtlasVectorSearch(
    new OpenAIEmbeddings(),
    { collection: client.db().collection("cases") }
  );
  const retriever = store.asRetriever({ k: 5 });
  const llm = new OpenAI({
    temperature: 0,
    model: process.env.DEEPSEEK_MODEL,
    apiKey: process.env.DEEPSEEK_API_KEY,
    configuration: {
      baseURL: process.env.DEEPSEEK_BASE_URL,
    },
  });

  // LCEL pipeline: retrieve -> LLM -> output parse
  const chain = RunnableSequence.from([
    async (input) => {
      const docs = await retriever.invoke(input);
      return { docs, input };
    },
    async ({ docs, input }: { docs: Array<{ pageContent: string }>, input: any }) => {
      const answer = await llm.invoke(docs.map((doc) => doc.pageContent).join("\n"));
      return { answer, sourceDocuments: docs };
    }
  ]);

  return chain;
}

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
  const llm = new OpenAI({ temperature: 0 });

  // LCEL pipeline: retrieve -> LLM -> output parse
  const chain = RunnableSequence.from([
    (input) => retriever.invoke(input),
    (docs: Array<{ pageContent: string }>) => llm.invoke(docs.map((doc) => doc.pageContent).join("\n")),
    new StringOutputParser(),
  ]);

  return chain;
}

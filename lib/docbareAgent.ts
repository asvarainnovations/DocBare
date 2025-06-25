import { OpenAI } from 'langchain/llms/openai';
import { MongoVectorStore } from 'langchain/vectorstores/mongodb';
import { RetrievalQAChain } from 'langchain/chains';
import { MongoClient } from 'mongodb';

export async function createDocBareAgent() {
  const store = await MongoVectorStore.fromExistingIndex(
    new MongoClient(process.env.MONGODB_URI!),
    { collectionName: 'cases', url: process.env.MONGODB_URI! }
  );

  const retriever = store.asRetriever({ k: 5 });
  const llm = new OpenAI({ temperature: 0 });

  return RetrievalQAChain.fromLLM(llm, retriever, {
    returnSourceDocuments: true,
  });
} 
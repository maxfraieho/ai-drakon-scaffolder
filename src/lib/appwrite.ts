import { Client, Account, Databases } from "appwrite";

const client = new Client()
  .setEndpoint("https://auth.aidrakon.tech/v1")
  .setProject("6a23420a003a04b4997b");

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };

import type { GearApi } from "@gear-js/api";
import idlRaw from "@/assets/demo.idl?raw";

let cachedSails: Promise<unknown> | null = null;

export async function initSails(api: GearApi) {
  if (!cachedSails) {
    cachedSails = (async () => {
      const [{ Sails }, { SailsIdlParser }] = await Promise.all([
        import("sails-js"),
        import("sails-js-parser"),
      ]);
      const parser = await SailsIdlParser.new();
      const sails = new Sails(parser);
      sails.setApi(api);
      sails.parseIdl(idlRaw);

      const programId = import.meta.env.VITE_PROGRAM_ID;
      if (programId) {
        sails.setProgramId(programId as `0x${string}`);
      }

      return sails;
    })().catch((err) => {
      cachedSails = null;
      throw err;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return cachedSails as Promise<any>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getService(sails: any): any {
  return sails?.services?.Demo ?? sails?.services?.demo;
}

// -- Queries --

export async function queryState(api: GearApi) {
  const sails = await initSails(api);
  const service = getService(sails);
  return service.queries.GetState().call();
}

export async function queryCounter(api: GearApi) {
  const sails = await initSails(api);
  const service = getService(sails);
  return service.queries.GetCounter().call();
}

export async function queryMessages(api: GearApi) {
  const sails = await initSails(api);
  const service = getService(sails);
  return service.queries.GetMessages().call();
}

// -- Transactions --

export async function txIncrement(
  api: GearApi,
  account: string,
  signer?: unknown
) {
  const sails = await initSails(api);
  const service = getService(sails);
  const tx = service.functions.Increment();
  const result = await tx
    .withAccount(account, signer ? { signer } : undefined)
    .calculateGas()
    .then(() => tx.signAndSend());
  return result.response();
}

export async function txSendMessage(
  api: GearApi,
  account: string,
  text: string,
  signer?: unknown
) {
  const sails = await initSails(api);
  const service = getService(sails);
  const tx = service.functions.SendMessage(text);
  const result = await tx
    .withAccount(account, signer ? { signer } : undefined)
    .calculateGas()
    .then(() => tx.signAndSend());
  return result.response();
}

export async function txSchedulePing(
  api: GearApi,
  account: string,
  delay: number,
  signer?: unknown
) {
  const sails = await initSails(api);
  const service = getService(sails);
  const tx = service.functions.SchedulePing(delay);
  const result = await tx
    .withAccount(account, signer ? { signer } : undefined)
    .calculateGas()
    .then(() => tx.signAndSend());
  return result.response();
}

/** Get the raw IDL text for the debug panel. */
export function getIdlText(): string {
  return idlRaw;
}

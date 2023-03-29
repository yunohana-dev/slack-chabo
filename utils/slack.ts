import { DatastoreItem, SlackAPIClient } from "deno-slack-api/types.ts";
import {
  DatastoreGetResponse,
  DatastoreSchema,
} from "deno-slack-api/typed-method-types/apps.ts";
import { TALK_HISTORY_DATASTORE } from "../constants/slack.ts";

/**
 * IDで指定する先のチャネルへメッセージを投稿する
 * @param cid Channel ID
 */
export const PostMessage = async (
  c: SlackAPIClient,
  cid: string,
  text: string,
) => {
  return await c.chat.postMessage({
    channel: cid,
    text,
  });
};

/**
 * TimeStampで指定するメッセージを更新する
 * @param cid Channel ID
 * @param ts Message TimeStamp
 */
export const UpdateMessage = async (
  c: SlackAPIClient,
  cid: string,
  ts: string,
  text: string,
) => {
  return await c.chat.update({
    channel: cid,
    ts,
    text,
  });
};

const uploadFile = async (
  c: SlackAPIClient,
  cid: string,
  title: string,
  content: string,
  filetype: string,
) => {
  return await c.files.upload({
    channels: cid,
    title,
    content,
    filetype,
  });
};

export const UploadTalkHistory = async (
  c: SlackAPIClient,
  cid: string,
  content: string,
) => {
  return await uploadFile(c, cid, "talk history", content, "yaml");
};

const findItem = async (
  c: SlackAPIClient,
  id: string,
  ds: string,
): Promise<DatastoreGetResponse<DatastoreSchema>> => {
  return await c.apps.datastore.get({
    datastore: ds,
    id: id,
  });
};

/**
 * DataStoreからUser IDの会話履歴を取得する
 * @param uid User ID
 */
export const FindTalkHistory = async (
  c: SlackAPIClient,
  uid: string,
) => {
  const res = await findItem(c, uid, TALK_HISTORY_DATASTORE);
  return (res.item.history || []).map((h: string) => JSON.parse(h));
};

const updateItem = async (
  c: SlackAPIClient,
  item: DatastoreItem<DatastoreSchema>,
  ds: string,
) => {
  await c.apps.datastore.update({
    datastore: ds,
    item: item,
  });
};

/**
 * DataStoreのUser IDの会話履歴を更新する
 * @param uid User ID
 */
export const UpdateTalkHistory = async (
  c: SlackAPIClient,
  uid: string,
  histories: unknown[],
) => {
  const item = {
    id: uid,
    history: histories.map((h) => JSON.stringify(h)),
  };
  await updateItem(c, item, TALK_HISTORY_DATASTORE);
};

const deleteItem = async (
  c: SlackAPIClient,
  id: string,
  ds: string,
) => {
  await c.apps.datastore.delete({
    datastore: ds,
    id: id,
  });
};

/**
 * DataStoreからUser IDの会話履歴を削除する
 * @param uid User ID
 */
export const DeleteTalkHistory = async (
  c: SlackAPIClient,
  uid: string,
) => {
  await deleteItem(c, uid, TALK_HISTORY_DATASTORE);
};

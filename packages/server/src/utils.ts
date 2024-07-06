import kebabCase from "lodash/kebabCase";

export const generateRandomString = (length: number) => {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";

  const result = Array.from({ length }).reduce((acc, _) => {
    const randomIndex = Math.floor(Math.random() * characters.length);
    return acc + characters[randomIndex]!;
  }, "");

  return result;
};

export const generateUniqueFileKey = (filename: string) => {
  const parts = filename.split(".");
  const extension =
    parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : undefined;
  const name = kebabCase(parts.join("."));
  const suffix = generateRandomString(5);
  const key = `${name}_${suffix}${extension}`;

  return key;
};

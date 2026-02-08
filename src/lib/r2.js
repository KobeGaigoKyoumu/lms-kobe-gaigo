import { S3Client } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
export const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN;

/**
 * R2 の公開 URL を取得する
 * @param {string} key ファイルのパス（キー）
 * @returns {string} フルURL
 */
export function getR2PublicUrl(key) {
    if (!R2_PUBLIC_DOMAIN) return "";
    const domain = R2_PUBLIC_DOMAIN.endsWith('/') ? R2_PUBLIC_DOMAIN.slice(0, -1) : R2_PUBLIC_DOMAIN;
    return `${domain}/${key}`;
}

export { r2Client };

"use server";

import imagekit from "@/lib/imagekit";

/**
 * ImageKitにファイルをアップロードする
 * @param {FormData} formData - アップロードするファイルを含むFormData
 * @param {string} folder - 保存先のフォルダパス（例: '/materials'）
 */
export async function uploadToImageKit(formData, folder = "/lms") {
    try {
        const file = formData.get("file");
        if (!file) {
            throw new Error("ファイルが見つかりません");
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        const response = await imagekit.upload({
            file: buffer,
            fileName: file.name,
            folder: folder,
            useUniqueFileName: true,
        });

        return {
            success: true,
            url: response.url,
            fileId: response.fileId,
            path: response.filePath,
        };
    } catch (error) {
        console.error("ImageKit Upload Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * ImageKitからファイルを削除する
 * @param {string} fileId - 削除するファイルのfileId
 */
export async function deleteFromImageKit(fileId) {
    try {
        await imagekit.deleteFile(fileId);
        return { success: true };
    } catch (error) {
        console.error("ImageKit Delete Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * 署名付き認証パラメータを取得する（クライアントサイド・アップロード用など）
 */
export async function getImageKitAuthParams() {
    try {
        const params = imagekit.getAuthenticationParameters();
        return { success: true, ...params };
    } catch (error) {
        console.error("ImageKit Auth Params Error:", error);
        return { success: false, error: error.message };
    }
}

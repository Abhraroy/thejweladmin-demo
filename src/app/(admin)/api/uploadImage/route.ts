import { uploadImageToCloudflare } from "@/app/utils/cloudflare";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string | null;

    if (!file) {
      return Response.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const options = folder ? { folder } : {};
    const result = await uploadImageToCloudflare(file, options);

    if (!result.success) {
      return Response.json(
        { success: false, error: result.error || "Upload failed" },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      url: result.url,
      key: result.key,
    });
  } catch (error) {
    console.error("Upload API error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

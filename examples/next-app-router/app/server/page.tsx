import { Input } from "~/components/ui/input";
import { storage } from "../api/storage/[...storage]/route";

export default async function Page() {
  const { urls } = await storage.avatar.getFiles({
    input: {
      id: "123",
    },
  });

  const submit = async (formdata: FormData) => {
    "use server";

    const file = formdata.get("my-file") as File;

    const { url } = await storage.avatar.upload({
      file,
      input: {
        id: "123",
      },
      context: {
        user: { id: 2, name: "Bob Doe" },
      },
    });

    await storage.avatar.confirm(url);
  };

  return (
    <div className="container py-8">
      <form action={submit}>
        <Input type="file" name="my-file" />
        <button>Verzenden</button>
      </form>
      <div className="grid grid-cols-3">
        {urls.map((url) => (
          <img src={url} key={url} className="rounded-lg" />
        ))}
      </div>
    </div>
  );
}

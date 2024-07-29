import { Input } from "~/components/ui/input";
import { storage } from "../api/storage/[...storage]/route";

export default function Page() {
  const submit = async (formdata: FormData) => {
    "use server";

    const file = formdata.get("my-file") as File;

    const { url } = await storage.banner.upload({
      file,
      input: {
        bannerId: 2,
      },
      context: {
        user: { id: 24, name: "Bob Doe" },
      },
    });

    console.log(url);
  };

  return (
    <div className="container py-8">
      <form action={submit}>
        <Input type="file" name="my-file" />
        <button>Verzenden</button>
      </form>
    </div>
  );
}

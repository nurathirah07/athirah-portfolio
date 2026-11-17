import ProjectStack from "@/components/ProjectStack";
import WorkIntro from "@/components/WorkIntro";
import { site } from "@/data/site";

export const metadata = { title: `Work — ${site.name}` };

export default function Work() {
  return (
    <>
      <WorkIntro />
      <ProjectStack />
    </>
  );
}

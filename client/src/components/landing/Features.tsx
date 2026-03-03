import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import {
  Code2,
  Users,
  GraduationCap,
  FileCheck,
  Timer,
  GitBranch,
  BarChart3,
} from "lucide-react";

const features = [
  {
    title: "AI-Powered IDE",
    description:
      "Monaco editor with multi-language support, integrated terminal, and AI assistance for debugging and refactoring.",
    icon: <Code2 className="h-5 w-5" />,
    className: "md:col-span-1 lg:col-span-2",
  },
  {
    title: "Real-Time Collaboration",
    description:
      "Code together with live cursors, synchronized editing, and role-based access control.",
    icon: <Users className="h-5 w-5" />,
    className: "md:col-span-1",
  },
  {
    title: "Classroom System",
    description:
      "Create classes, invite students, manage assignments with templates and due dates.",
    icon: <GraduationCap className="h-5 w-5" />,
    className: "md:col-span-1",
  },
  {
    title: "Assignment Mode",
    description:
      "Dedicated workspaces per student with auto-submit, submission snapshots, and code review.",
    icon: <FileCheck className="h-5 w-5" />,
    className: "md:col-span-1 lg:col-span-2",
  },
  {
    title: "Timed Exams",
    description:
      "Strict timers, disabled AI, locked submissions, and optional real-time monitoring.",
    icon: <Timer className="h-5 w-5" />,
    className: "md:col-span-1",
  },
  {
    title: "GitHub Integration",
    description:
      "Login with GitHub, import repos, commit, push, and manage branches.",
    icon: <GitBranch className="h-5 w-5" />,
    className: "md:col-span-1",
  },
  {
    title: "Teacher Analytics",
    description:
      "Track submissions, time taken, code metrics, and compare student progress.",
    icon: <BarChart3 className="h-5 w-5" />,
    className: "md:col-span-1",
  },
];

export const Features = () => {
  return (
    <section id="features" className="relative px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-zinc-500">
            Features
          </p>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to build and teach
          </h2>
        </div>

        <BentoGrid>
          {features.map((feature) => (
            <BentoGridItem
              key={feature.title}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              className={feature.className}
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
};

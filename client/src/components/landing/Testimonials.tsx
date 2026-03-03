import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";

const testimonials = [
  {
    quote:
      "Nebula changed how I run my CS courses. Dedicated workspaces save hours every week.",
    name: "Dr. Sarah Chen",
    title: "Professor, CS",
  },
  {
    quote:
      "Real-time collaboration feels natural. Pair-programming with zero setup friction.",
    name: "Alex Rivera",
    title: "Senior Engineer",
  },
  {
    quote:
      "Toggle AI off for exams, keep it on for practice. Exactly what we needed.",
    name: "James Park",
    title: "Bootcamp Instructor",
  },
  {
    quote:
      "Students learn real GitHub workflows from day one. No more zip file submissions.",
    name: "Maya Johnson",
    title: "Teaching Assistant",
  },
  {
    quote:
      "Docker isolation per workspace — no more 'it works on my machine' excuses.",
    name: "Raj Patel",
    title: "DevOps Lead",
  },
];

export const Testimonials = () => {
  return (
    <section id="testimonials" className="relative py-24">
      {/* Subtle colored accent glow */}
      <div className="pointer-events-none absolute left-1/4 top-0 h-64 w-64 rounded-full bg-yellow-500/[0.03] blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 bottom-0 h-64 w-64 rounded-full bg-green-500/[0.03] blur-3xl" />

      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-zinc-600">
            Testimonials
          </p>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Trusted by educators & engineers
          </h2>
        </div>
      </div>

      <InfiniteMovingCards
        items={testimonials}
        direction="left"
        speed="slow"
      />
    </section>
  );
};

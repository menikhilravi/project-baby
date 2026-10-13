import { notFound } from "next/navigation";
import { Playground } from "./playground";

// Dev-only kitchen sink for the design system (mascot, milk, rings, sheets…).
export default function PlaygroundPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Playground />;
}

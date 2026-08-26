import { createFileRoute } from "@tanstack/react-router";
import ResetPassword from "@/_pages_legacy/ResetPassword";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

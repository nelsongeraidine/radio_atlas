import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next/font/google", () => ({
  Inter: () => ({
    className: "font-inter",
    variable: "--font-inter",
  }),
}));

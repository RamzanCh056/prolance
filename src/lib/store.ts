// Local-first store for clients, invoices, templates, proposals.
// Persists to localStorage. Easy to swap for Lovable Cloud DB later.
import { useEffect, useState } from "react";

export type ClientStatus = "Lead" | "Active" | "Completed";
export interface Client {
  id: string;
  name: string;
  email: string;
  project: string;
  status: ClientStatus;
  notes?: string;
  createdAt: number;
}
export interface Invoice {
  id: string;
  clientName: string;
  service: string;
  amount: number;
  date: string; // ISO
  number: string;
  notes?: string;
  createdAt: number;
}
export interface Template {
  id: string;
  title: string;
  category: "Web Development" | "Mobile App" | "UI/UX Design" | "Custom";
  content: string;
  builtIn?: boolean;
}
export interface Proposal {
  id: string;
  jobTitle: string;
  jobDescription: string;
  content: string;
  createdAt: number;
}

const KEYS = {
  clients: "ft-clients",
  invoices: "ft-invoices",
  templates: "ft-templates",
  proposals: "ft-proposals",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("ft-store-update", { detail: key }));
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function useStore<T>(key: string, fallback: T) {
  const [state, setState] = useState<T>(() => read<T>(key, fallback));
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<string>;
      if (ce.detail === key) setState(read<T>(key, fallback));
    };
    window.addEventListener("ft-store-update", handler);
    return () => window.removeEventListener("ft-store-update", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

// Clients
export const useClients = () => useStore<Client[]>(KEYS.clients, []);
export const saveClient = (c: Client) => {
  const all = read<Client[]>(KEYS.clients, []);
  const idx = all.findIndex((x) => x.id === c.id);
  if (idx >= 0) all[idx] = c;
  else all.unshift(c);
  write(KEYS.clients, all);
};
export const deleteClient = (id: string) => {
  write(KEYS.clients, read<Client[]>(KEYS.clients, []).filter((c) => c.id !== id));
};

// Invoices
export const useInvoices = () => useStore<Invoice[]>(KEYS.invoices, []);
export const saveInvoice = (i: Invoice) => {
  const all = read<Invoice[]>(KEYS.invoices, []);
  const idx = all.findIndex((x) => x.id === i.id);
  if (idx >= 0) all[idx] = i;
  else all.unshift(i);
  write(KEYS.invoices, all);
};
export const deleteInvoice = (id: string) => {
  write(KEYS.invoices, read<Invoice[]>(KEYS.invoices, []).filter((c) => c.id !== id));
};

// Templates
const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: "tpl-web-1",
    title: "Modern Web Development Pitch",
    category: "Web Development",
    builtIn: true,
    content:
      "Hi [Client], I help businesses launch fast, conversion-focused websites that scale. Based on your brief, I'd build a modern, responsive site with clean architecture, performance optimization, and SEO best practices. I'll deliver in clear milestones with regular previews so you stay in control. Ready to kick off this week — shall we set up a 15-minute call?",
  },
  {
    id: "tpl-mobile-1",
    title: "Mobile App MVP Proposal",
    category: "Mobile App",
    builtIn: true,
    content:
      "Hi [Client], I specialize in shipping polished mobile MVPs that users love. For your project, I'd scope a focused feature set, design a smooth user experience, and deliver a production-ready build with thoughtful animations and rock-solid performance. You'll get weekly demos and full source ownership. Want to lock in a start date?",
  },
  {
    id: "tpl-ux-1",
    title: "UI/UX Design Sprint",
    category: "UI/UX Design",
    builtIn: true,
    content:
      "Hi [Client], I design interfaces that feel effortless and convert. I'd run a focused sprint: discovery, wireframes, a polished design system, and high-fidelity screens ready for development. You'll get a clickable prototype and a handoff-ready Figma file. Let's jump on a quick call to align on goals — when works for you?",
  },
];

export const useTemplates = (): Template[] => {
  const custom = useStore<Template[]>(KEYS.templates, []);
  return [...BUILT_IN_TEMPLATES, ...custom];
};
export const saveTemplate = (t: Template) => {
  const all = read<Template[]>(KEYS.templates, []);
  const idx = all.findIndex((x) => x.id === t.id);
  if (idx >= 0) all[idx] = t;
  else all.unshift(t);
  write(KEYS.templates, all);
};
export const deleteTemplate = (id: string) => {
  write(KEYS.templates, read<Template[]>(KEYS.templates, []).filter((c) => c.id !== id));
};

// Proposals
export const useProposals = () => useStore<Proposal[]>(KEYS.proposals, []);
export const saveProposal = (p: Proposal) => {
  const all = read<Proposal[]>(KEYS.proposals, []);
  all.unshift(p);
  write(KEYS.proposals, all.slice(0, 50));
};
export const deleteProposal = (id: string) => {
  write(KEYS.proposals, read<Proposal[]>(KEYS.proposals, []).filter((c) => c.id !== id));
};

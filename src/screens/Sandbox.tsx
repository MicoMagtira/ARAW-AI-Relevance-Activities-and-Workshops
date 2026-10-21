// Chatbot Sandbox route (`#/sandbox`). The screen, and the AI engine behind it, load only when it is opened.
import { LazyScreen } from './LazyScreen';

const load = () => import('./sandbox/SandboxScreen');

export function Sandbox() {
  return <LazyScreen load={load} />;
}

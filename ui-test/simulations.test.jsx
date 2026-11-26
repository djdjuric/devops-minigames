import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { DuckProvider } from "../src/components/DuckContext.jsx";
import K8sGame from "../src/games/K8sGame.jsx";
import SgGame from "../src/games/SgGame.jsx";
import ShellGame from "../src/games/ShellGame.jsx";

const wrap = (component) => render(<DuckProvider>{component}</DuckProvider>);

test("Kubernetes simulation reacts to a fixed readiness path", async () => {
  const user = userEvent.setup();
  wrap(<K8sGame onFinish={() => { }} />);
  const path = screen.getByLabelText("Readiness path");
  await user.clear(path);
  await user.type(path, "/health");
  await user.click(screen.getByRole("button", { name: "Apply deployment" }));
  expect(screen.getByRole("button", { name: "Rolling out..." })).toBeDisabled();
  expect(await screen.findByText(/Deployment healthy!/, {}, { timeout: 2500 })).toBeInTheDocument();
  expect(screen.getAllByText("Ready")).toHaveLength(2);
});

test("Shell simulation accepts the real fix commands", async () => {
  const user = userEvent.setup();
  wrap(<ShellGame onFinish={() => { }} />);
  const input = screen.getByLabelText("Shell command");
  await user.type(input, "docker logs api{Enter}");
  expect(screen.getByText("Error: DATABASE_URL is not set")).toBeInTheDocument();
  await user.type(input, "docker rm api{Enter}");
  await user.type(
    input,
    "docker run -d --name api -p 8080:8080 -e DATABASE_URL=postgres://db.internal/app myapp:1.0{Enter}",
  );
  expect(screen.getByText(/Fixed! \+/)).toBeInTheDocument();
});

test("Security Group simulation allows adding the missing HTTPS rule", async () => {
  const user = userEvent.setup();
  wrap(<SgGame onFinish={() => { }} />);
  await user.click(screen.getByRole("button", { name: "Add rule" }));
  const protocols = screen.getAllByLabelText("Protocol");
  const fromPorts = screen.getAllByLabelText("From port");
  const toPorts = screen.getAllByLabelText("To port");
  const sources = screen.getAllByLabelText("Source CIDR");
  await user.selectOptions(protocols[1], "tcp");
  await user.type(fromPorts[1], "443");
  await user.type(toPorts[1], "443");
  await user.type(sources[1], "0.0.0.0/0");
  await user.click(screen.getByRole("button", { name: "Send traffic" }));
  expect(await screen.findByText(/Server secured!/, {}, { timeout: 5000 })).toBeInTheDocument();
  expect(screen.getAllByText(/Reached the server/)).toHaveLength(2);
}, 8000);

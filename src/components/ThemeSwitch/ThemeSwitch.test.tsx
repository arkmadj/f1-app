import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ThemeSwitch from "./ThemeSwitch";

describe("ThemeSwitch", () => {
  it("renders a switch input", () => {
    render(<ThemeSwitch checked={false} onChange={() => {}} />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("is unchecked when checked prop is false", () => {
    render(<ThemeSwitch checked={false} onChange={() => {}} />);
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("is checked when checked prop is true", () => {
    render(<ThemeSwitch checked={true} onChange={() => {}} />);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("uses light-mode aria-label when unchecked", () => {
    render(<ThemeSwitch checked={false} onChange={() => {}} />);
    expect(
      screen.getByRole("switch", { name: /switch to dark mode/i })
    ).toBeInTheDocument();
  });

  it("uses dark-mode aria-label when checked", () => {
    render(<ThemeSwitch checked={true} onChange={() => {}} />);
    expect(
      screen.getByRole("switch", { name: /switch to light mode/i })
    ).toBeInTheDocument();
  });

  it("updates aria-label when checked prop changes", () => {
    const { rerender } = render(
      <ThemeSwitch checked={false} onChange={() => {}} />
    );
    expect(
      screen.getByRole("switch", { name: /switch to dark mode/i })
    ).toBeInTheDocument();

    rerender(<ThemeSwitch checked={true} onChange={() => {}} />);
    expect(
      screen.getByRole("switch", { name: /switch to light mode/i })
    ).toBeInTheDocument();
  });

  it("calls onChange with the new checked value when toggled on", () => {
    const onChange = vi.fn();
    render(<ThemeSwitch checked={false} onChange={onChange} />);

    userEvent.click(screen.getByRole("switch"));

    expect(onChange).toHaveBeenCalledTimes(1);
    const [, value] = onChange.mock.calls[0];
    expect(value).toBe(true);
  });

  it("calls onChange with false when toggled off", () => {
    const onChange = vi.fn();
    render(<ThemeSwitch checked={true} onChange={onChange} />);

    userEvent.click(screen.getByRole("switch"));

    expect(onChange).toHaveBeenCalledTimes(1);
    const [, value] = onChange.mock.calls[0];
    expect(value).toBe(false);
  });

  it("calls onClick when the switch is clicked", () => {
    const onClick = vi.fn();
    render(
      <ThemeSwitch checked={false} onChange={() => {}} onClick={onClick} />
    );

    userEvent.click(screen.getByRole("switch"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("reflects state changes in a controlled parent across multiple toggles", () => {
    const Wrapper = () => {
      const [checked, setChecked] = useState(false);
      return (
        <ThemeSwitch
          checked={checked}
          onChange={(_, value) => setChecked(value)}
        />
      );
    };

    render(<Wrapper />);
    const input = screen.getByRole("switch");

    expect(input).not.toBeChecked();

    userEvent.click(input);
    expect(input).toBeChecked();
    expect(
      screen.getByRole("switch", { name: /switch to light mode/i })
    ).toBeInTheDocument();

    userEvent.click(input);
    expect(input).not.toBeChecked();
    expect(
      screen.getByRole("switch", { name: /switch to dark mode/i })
    ).toBeInTheDocument();
  });

  it("propagates the disabled prop to the underlying input", () => {
    render(<ThemeSwitch checked={false} onChange={() => {}} disabled />);
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("forwards extra props to the underlying input (e.g. name)", () => {
    render(
      <ThemeSwitch checked={false} onChange={() => {}} name="theme-toggle" />
    );
    expect(screen.getByRole("switch")).toHaveAttribute("name", "theme-toggle");
  });
});

import { Switch, styled } from "@mui/material";
import type { SwitchProps } from "@mui/material";

const SUN_ICON =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FFFFFF'><circle cx='12' cy='12' r='4.5'/><g stroke='%23FFFFFF' stroke-width='2' stroke-linecap='round'><line x1='12' y1='2.5' x2='12' y2='5'/><line x1='12' y1='19' x2='12' y2='21.5'/><line x1='2.5' y1='12' x2='5' y2='12'/><line x1='19' y1='12' x2='21.5' y2='12'/><line x1='4.6' y1='4.6' x2='6.4' y2='6.4'/><line x1='17.6' y1='17.6' x2='19.4' y2='19.4'/><line x1='4.6' y1='19.4' x2='6.4' y2='17.6'/><line x1='17.6' y1='6.4' x2='19.4' y2='4.6'/></g></svg>\")";

const MOON_ICON =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23E8EDF7'><path d='M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'/></svg>\")";

const StyledSwitch = styled(Switch)(({ theme }) => ({
  width: 64,
  height: 36,
  padding: 7,
  overflow: "visible",
  "& .MuiSwitch-switchBase": {
    margin: 1,
    padding: 0,
    transform: "translateX(6px)",
    transition: theme.transitions.create(["transform"], {
      duration: 350,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    }),
    "&:hover .MuiSwitch-thumb": {
      transform: "scale(1.06)",
    },
    "&.Mui-checked": {
      color: "#fff",
      transform: "translateX(28px)",
      "& .MuiSwitch-thumb": {
        backgroundColor: "#1c2541",
        boxShadow:
          "0 0 10px rgba(10, 18, 40, 0.55), inset -3px -2px 4px rgba(255,255,255,0.08)",
        "&::before": {
          backgroundImage: MOON_ICON,
        },
      },
      "& + .MuiSwitch-track": {
        opacity: 1,
        background: "linear-gradient(135deg, #0b1d3a 0%, #1c2541 100%)",
      },
    },
    "&.Mui-focusVisible .MuiSwitch-thumb": {
      boxShadow: `0 0 0 3px ${theme.palette.primary.main}55`,
    },
  },
  "& .MuiSwitch-thumb": {
    backgroundColor: "#FFB300",
    width: 30,
    height: 30,
    boxShadow:
      "0 0 12px rgba(255, 179, 0, 0.55), inset -3px -2px 4px rgba(0,0,0,0.08)",
    transition: theme.transitions.create(
      ["background-color", "box-shadow", "transform"],
      { duration: 350, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
    ),
    "&::before": {
      content: '""',
      position: "absolute",
      inset: 0,
      backgroundImage: SUN_ICON,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
      backgroundSize: "20px 20px",
      transition: "background-image 0.35s ease-in-out",
    },
  },
  "& .MuiSwitch-track": {
    opacity: 1,
    borderRadius: 18,
    background: "linear-gradient(135deg, #87CEEB 0%, #4FA3D1 100%)",
    transition: theme.transitions.create(["background"], { duration: 350 }),
  },
}));

export type ThemeSwitchProps = SwitchProps & {
  checked: boolean;
};

const ThemeSwitch = ({
  checked,
  onChange,
  onClick,
  ...rest
}: ThemeSwitchProps) => (
  <StyledSwitch
    checked={checked}
    onChange={onChange}
    onClick={onClick}
    inputProps={{
      role: "switch",
      "aria-label": checked ? "Switch to light mode" : "Switch to dark mode",
    }}
    {...rest}
  />
);

export default ThemeSwitch;

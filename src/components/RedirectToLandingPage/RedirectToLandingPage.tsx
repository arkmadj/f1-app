import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { toast } from "react-toastify";

function RedirectToLandingPage(): null {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    toast.error("URL no válida. Redirigiendo a la página principal.");
    navigate({ to: "/", replace: true });
  }, [navigate, location]);

  return null;
}

export default RedirectToLandingPage;

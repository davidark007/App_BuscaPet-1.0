import { install, tw } from "@twind/core";
import presetAutoprefix from "@twind/preset-autoprefix";
import presetTailwind from "@twind/preset-tailwind";

install({
  presets: [presetAutoprefix(), presetTailwind()],
  preflight: false,
  theme: {
    extend: {
      colors: {
        pet: {
          ink: "#17211f",
          muted: "#64736f",
          mint: "#f0faf6",
          teal: "#0f766e",
          deep: "#134e4a",
          amber: "#f4b451",
        },
      },
      boxShadow: {
        "pet-soft": "0 18px 45px rgba(19, 78, 74, 0.16)",
        "pet-lift": "0 24px 60px rgba(19, 78, 74, 0.22)",
      },
    },
  },
});

export { tw };

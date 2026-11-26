# jsonresume-connect on the fleet's shared repo shape (github:ismailkattakath/repo-kit).
#
#   nix develop           → Node.js 24 (.nvmrc) + git; then npm ci / npm test as in CONTRIBUTING.md
#   nix fmt               → treefmt (nixfmt) over this flake; Prettier still owns the JS/JSON
#   nix flake check       → treefmt + toolchain-complete + the generated-file drift checks
#   nix run .#write-files → regenerate LICENSE, .envrc and devcontainer.json
#
# A lean flake on purpose: its only job is the generated files. `.editorconfig` stays the
# repo's own: its [{LICENSE,LICENSES/*}] section keeps the verbatim licence texts from being
# reformatted, which the kit's baseline does not carry.
{
  description = "jsonresume-connect — a Google Workspace Studio step that renders a JSON Resume into a Google Doc";

  inputs = {
    repo-kit.url = "github:ismailkattakath/repo-kit";
    nixpkgs.follows = "repo-kit/nixpkgs";
    flake-parts.follows = "repo-kit/flake-parts";
  };

  outputs =
    inputs@{ flake-parts, repo-kit, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ repo-kit.flakeModules.default ];

      repoKit = {
        name = "jsonresume-connect";
        license = {
          spdx = "MIT";
          year = "2026";
          holder = "Ismail Kattakath";
        };
        # Verbatim licence texts (MIT from opensource.org, Apache-2.0 from apache.org):
        # never reformat them, which REUSE compliance depends on.
        editorconfig.settings."{LICENSE,LICENSES/*}" = {
          indent_size = "unset";
          trim_trailing_whitespace = "unset";
        };
      };

      perSystem =
        { pkgs, ... }:
        {
          repoKit = {
            devPackages = [
              pkgs.nodejs_24
              pkgs.git
            ];
            requiredBins = [
              "node"
              "npm"
              "git"
            ];
          };
        };
    };
}

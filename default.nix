let
  pkgs = import <nixpkgs> {};
in
pkgs.stdenv.mkDerivation {
  name = "zoning-map-digitizer";
  buildInputs = [ pkgs.yarn pkgs.elmPackages.elm ];
}

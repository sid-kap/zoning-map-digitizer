let
  pkgs = import <nixpkgs> {};

  rustNightlyNixRepo = pkgs.fetchFromGitHub {
     owner = "solson";
     repo = "rust-nightly-nix";
     rev = "7081bacc88037d9e218f62767892102c96b0a321";
     sha256 = "0dzqmbwl2fkrdhj3vqczk7fqah8q7mfn40wx9vqavcgcsss63m8p";
  };

  rustPackages = pkgs.callPackage rustNightlyNixRepo { };

  cargoNightly = rustPackages.cargo { date = "2018-02-07"; };
  rustcNightly = rustPackages.rustc { date = "2018-02-07"; };

  rustNightly = rustPackages.rustcWithSysroots {
    rustc = rustcNightly;
    sysroots = [
      (rustPackages.rust-std { })
      (rustPackages.rust-std { system = "wasm32-unknown-unknown"; })
    ];
  };
in
# buildInputs = [ rustNightly cargoNightly emscripten cmake yarn ];
pkgs.stdenv.mkDerivation {
  name = "zoning-map-digitizer";
  buildInputs = [
    pkgs.yarn
    rustNightly
    cargoNightly
  ];
}

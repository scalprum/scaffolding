interface Package {
  from: string;
  eager?: boolean;
  loaded?: number;
}

interface Packages {
  [key: string]: {
    [key: string]: Package;
  };
}

/**
 * Warns applications using the shared scope if they have packages multiple times
 */
export const warnDuplicatePkg = (packages: Packages) => {
  const entries = Object.entries(packages);

  entries.forEach(([pkgName, versions]) => {
    const instances = Object.keys(versions);
    if (instances.length > 1) {
      console.log(
        `You have ${pkgName} package that is being loaded into browser multiple times. You might want to align your version with the chrome one.`
      );
      console.log(`All packages instances:`, versions);
    }
  });
};

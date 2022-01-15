const fs = require('fs-extra');
const chalk = require('colorette');
const readline = require('readline');

console.log(chalk.yellow("Good Morning, Captain"));
console.log(chalk.green("Welcome to the TTPG dev environment setup"));

const projectConfig = fs.readJsonSync("./config/project.json");
const variantConfig = projectConfig.variants[projectConfig.defaultVariant];

const getSuggestedFolder = () => {
    if (process.platform === 'darwin') {
        return process.env.HOME + "/Library/Application Support/Epic/TabletopPlayground/Package"
    } else if (process.platform === 'win32') {
        return "C:\\Program Files (x86)\\Steam\\steamapps\\common\\TabletopPlayground\\TabletopPlayground\\PersistentDownloadDir";
    }
    return null;
}

const setupWorkspace = (localConfig) => {
    console.log("setting up workspace...");
    const manifest = {
        Name: `${variantConfig.name} (Dev)`,
        Version: variantConfig.version,
        GUID: variantConfig.guid.dev
    }

    console.log("building 'dev' folder");
    return fs.pathExists(`./dev/${variantConfig.slug}_dev`).then((alreadyInPlace) => {
        if (alreadyInPlace) {
            return Promise.reject(`path './dev/${variantConfig.slug}_dev' already exists. It looks like you've already been set up`);
        } else {
            return fs.ensureDir(`./dev/${variantConfig.slug}_dev`).then(() => {
                return fs.ensureFile(`./dev/${variantConfig.slug}_dev/Manifest.json`).then(() => {
                    fs.writeJson(`./dev/${variantConfig.slug}_dev/Manifest.json`, manifest).then(() => {
                        return fs.ensureDir(`./dev/${variantConfig.slug}_dev/Scripts/node_modules`).then(() => {
                            console.log("'dev' folder built");
                        })
                    })
                })
            }).then(() => {
                console.log("symlinking assets to dev folder");

                const toLink = [
                    ...projectConfig.assets,
                    ...('assets' in variantConfig ? variantConfig.assets : [])
                ];

                return Promise.all(
                    toLink.map(({ from, to }) => {
                        console.log(from, "->", to);
                        return fs.createSymlinkSync(`./assets/${from}`, `./dev/${variantConfig.slug}_dev/${to}`, "junction")
                    })
                )
            }).then(() => {
                console.log("symlinking to Tabletop Playground");
                return fs.createSymlink(`./dev/${variantConfig.slug}_dev`, `${localConfig.ttpg_folder}/${variantConfig.slug}_dev`, "junction").then(() => {
                    console.log("Tabletop Playground is now aware of this project. Huzzah.");
                })
            })
        }
    })
};

Promise.all([
    fs.ensureDir("./assets/Fonts"),
    fs.ensureDir("./assets/Models"),
    fs.ensureDir("./assets/Sounds"),
    fs.ensureDir("./assets/States"),
    fs.ensureDir("./assets/Templates"),
    fs.ensureDir("./assets/Textures"),
    fs.ensureDir("./assets/Thumbnails"),
]).then(() => {
    return fs.pathExists("./config/local.json").then((doesExist) => {
        if (doesExist) {
            console.log("Local config found, using that");
            return fs.readJson("./config/local.json").then((config) => {
                return setupWorkspace(config);
            });
        } else {
            console.log("no local config found");
            const input = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            })
            return new Promise((resolve, reject) => {
                const suggestedFolder = getSuggestedFolder();
                return input.question(`Please enter your Tabletop Playground modding directory${suggestedFolder ? ` (${suggestedFolder})` : ""}`, (ttpg_folder) => {
                    ttpg_folder = ttpg_folder || suggestedFolder;
                    if (ttpg_folder === "") {
                        return reject("we couldn't determine where your TTPG installation folder is, sorry!")
                    }
                    const config = {
                        ttpg_folder
                    }
                    return resolve(config);
                })
            }).then((config) => {
                input.close();
                return setupWorkspace(config).then(() => {
                    return fs.writeJson("./config/local.json", config).then(() => {
                        return Promise.resolve(config);
                    });
                })
            }).catch((e) => {
                input.close();
                throw e;
            })
        }
    }).then(() => {
        console.log(chalk.green("You should be good to go. Good Hunting!"));
    }).catch((e) => {
        console.log(chalk.red("Something went wrong..."));
        console.error(chalk.red(e));
    });
})




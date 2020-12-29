export enum Type {
    Windows,
    Unix
}

export enum Drive {
    A,
    B,
    C,
    D,
    E,
    F,
    G,
    H,
    I,
    J,
    K,
    L,
    M,
    N,
    O,
    P,
    Q,
    R,
    S,
    T,
    U,
    V,
    W,
    X,
    Y,
    Z
}

export interface Options {
    root: string,
    pathType: Type
}

export default class Index {
    config: Options;

    constructor(config: Options) {
        this.config = config;
    }

    join(path: string | string[], ...paths: string[]): string {
        if (!(path instanceof Array))
            return this.clean([path, ...paths].join(this.config.pathType === Type.Unix ? '/' : '\\'));
        if (path instanceof Array)
            return this.clean(path.join(this.config.pathType === Type.Unix ? '/' : '\\'));

        if (paths instanceof Array && paths.length > 0)
            return this.clean(paths.join(this.config.pathType === Type.Unix ? '/' : '\\'));
    }

    isPath(path: string): boolean {
        if (this.config.pathType === Type.Unix)
            return path.startsWith('/') || path.startsWith('./') || path.startsWith('../');
        else
            return /^[a-zA-Z]:\\|\/.+/.test(path) || path.startsWith('.\\') || path.startsWith('./') || path.startsWith('..\\') || path.startsWith('../');
        // return this.config.pathType === Type.Unix ? path.includes("/") : path.includes("\\");
    }

    toUnix(path: string): string {
        if (path) {
            const _path: string = this.clean(path);

            if (/^[a-zA-Z]:.*/.test(_path))
                return [_path.slice(2).replace(/\\/g, '/')].join('/')
            return _path.replace(/\\/g, '/');
        }
    }

    toWindows(path: string, drive: Drive = Drive.C): string {
        if (path) {
            const _path: string = this.clean(path);

            if (/^\//.test(_path) || !/^[A-Z]:/g.test(_path))
                return [Drive[drive].toString().toUpperCase() + ":", _path.slice(1).replace(/\//g, '\\')].join('\\');

            return _path.replace(/\//g, '\\');
        }
    }

    split(path: string): string[] {
        if (path)
            return this.toUnix(path).split('/')
    }

    findBranch(root: string, branch: string): string {
        if (root && branch) {
            const segments = {
                root: this.split(root).filter(i => !!i.trim()),
                branch: this.split(branch).filter(i => !!i.trim())
            };

            if (segments.root.indexOf(segments.branch[0]) === -1)
                return null;
            return this.join([...segments.root.slice(0, segments.root.indexOf(segments.branch[0])), ...segments.branch]);
        }
    }

    contains(root: string, base: string | string[]): boolean {
        const segments = this.split(this.clean(root));
        const contains = (root: string, base: string): boolean => {
            const base_segments = this.split(this.clean(base));
            const root_segments = [...segments];

            for (const segment of base_segments)
                if (root_segments.shift() !== segment)
                    return false;
            return true;
        };

        return base instanceof Array ? !base.map(i => contains(root, i)).includes(false) : contains(root, base);
    }

    subtract(root: string, subtrahend: string): string {
        if (root && subtrahend) {
            const segments = this.split(subtrahend).filter(i => !!i.trim());

            const out: string[] = this.split(root).filter(i => !!i.trim());

            while (out.indexOf(segments[segments.length - 1]) === out.length - 1)
                out.pop();

            return this.join(out);
        }
    }

    up(path: string): string {
        return this.join(this.split(path).slice(0, -1));
    }

    constrain(root: string, input: string): string {
        const root_segments = this.split(this.clean(root));
        const input_segments = this.split(this.clean(input));

        for (let i = 0; i < root_segments.length; i++)
            if (input_segments[i] !== root_segments[i])
                return this.join(root_segments);
        return input
            ;
    }

    clean(path: string): string {
        if (path) {
            const segments: string[] = path.split(/[\/\\]/g);

            const resolve: string[] = [];

            for (const segment of segments)
                if (segment === "..")
                    resolve.pop();
                else if (segment === "~" && resolve.length === 0)
                    resolve.push(this.config.root);
                else if (segment === "$" && resolve.length === 0)
                    resolve.push(this.config.root);
                else if (segment !== ".")
                    resolve.push(segment);

            return resolve.join(this.config.pathType === Type.Unix ? '/' : '\\');
        }
    }
}

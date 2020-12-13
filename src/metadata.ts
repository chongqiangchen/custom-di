export class Self {
    name = 'Self';
}

export class SkipSelf {
    name = 'SkipSelf';
}

export class Optional {
    name = 'Optional'
}

export class Inject {
    name = 'Inject';
    token = null;

    constructor(token: any) {
        this.token = token;
    }
}

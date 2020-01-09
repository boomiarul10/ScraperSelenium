
var configuration = () => {

    var environment = process.env.NODE_ENV || "development";

    var config = {
        url: 'postgres://postgres:India123@localhost:5432/Bot',
        dialect: 'postgres'
    }

    switch (environment.toLowerCase()) {
        case "development":
            config = {
                url: 'postgres://postgres:India123@localhost:5432/Bot',
                dialect: 'postgres'
            }
            break;
        case "staging":
            config = {
                url: 'postgres://selenium:India123@172.17.4.21:5432/Bot',
                dialect: 'postgres'
            }
            break;
        case "production":
            config = {
                url: 'postgres://selenium:hJd7B3Jd3k1zOejM7Gehb@172.17.10.126:5432/Bot',
                dialect: 'postgres'
            }
            break;
        default:
            config = {
                url: 'postgres://postgres:India123@localhost:5432/Bot',
                dialect: 'postgres'
            }
            break;
    }
    return config;
}


module.exports = configuration();


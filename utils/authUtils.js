const registrationValidation = ({ email, username, password }) => {
    return new Promise((res, rej) => {
        if (!email || !username || !password) {
            rej("Missing User Credentials");
        }
        if (username.length < 3 || username.length > 20) {
            rej("Username length Should be 3-20");
        }
        if (!isEmailValidate({key: email})) {
            rej("Format of email is incorrect");
        }
        res();

    })
}

const isEmailValidate = ({ key }) => {
    const isEmail =
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i.test(
            key
        );
    return isEmail;
};

const loginValidation = ({loginID, password}) => {
  return new Promise((res,rej) => {
    if (loginID|| !password) {
        rej("Missing User Credentials");
    }
    res();
  })
}

module.exports = {registrationValidation, isEmailValidate, loginValidation};
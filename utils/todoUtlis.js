const todoValidation = (todo) => {
    return new Promise((res,rej) => {
        if(!todo)
        {
            rej("Todo is empty!");
        }
        res();
    })
}

module.exports = todoValidation;
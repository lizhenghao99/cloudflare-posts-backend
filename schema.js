import * as yup from 'yup';

const postSchema = yup.object().shape({
    title: yup.string().required(),
    username: yup.string().required(),
    content: yup.string().required(),
});

export { postSchema };
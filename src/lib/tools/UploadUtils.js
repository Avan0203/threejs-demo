class UploadUtils {
    static uploadFile({ formate, mutiple } = { formate: '', mutiple: false }) {
        return new Promise((resolve, reject) => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            // 处理多个文件格式，每个格式前都要加 .
            if (formate) {
                const formats = formate.split(',').map(f => `.${f.trim()}`).join(',');
                fileInput.accept = formats;
            }
            fileInput.style.display = 'none';
            fileInput.multiple = mutiple;
            document.body.appendChild(fileInput);
            fileInput.click();
            fileInput.onchange = () => {
                const files = fileInput.files;
                if (files.length > 0) {
                    resolve(files);
                } else {
                    reject(new Error('No file selected'));
                }
                document.body.removeChild(fileInput);
            };
        });
    }
}

export {UploadUtils}
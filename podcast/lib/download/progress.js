export function createProgress(label) {
  let lastPercent = 0;

  return (downloaded, total) => {
    const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0;
    if (percent >= lastPercent + 10 || percent === 100) {
      const dlMB = (downloaded / 1024 / 1024).toFixed(1);
      const totalMB = (total / 1024 / 1024).toFixed(1);
      process.stdout.write(`\r   ${label}：${percent}% (${dlMB}MB / ${totalMB}MB)`);
      lastPercent = percent;
    }
  };
}

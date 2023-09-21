exports.getSecret = (req, res) => {
  res.status(202).json({
    status: 'bu gizli',
    message: 'secret',
  });
};

interface Config {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  nodeEnv: string;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:victor2005@localhost:5432/finance_tracker',
  jwtSecret: process.env.JWT_SECRET || '37e016cb470d5a8c800dbd97e835f56b915e4da6b07579ae7ae8cfdc7bbc9358',
  nodeEnv: process.env.NODE_ENV || 'development'
};

export default config; 
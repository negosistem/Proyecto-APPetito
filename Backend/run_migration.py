import alembic.config
import sys
alembicArgs = ['upgrade', 'head']
alembic.config.main(argv=alembicArgs)

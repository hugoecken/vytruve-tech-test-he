FROM liquibase/liquibase:4.33.0

ENV LIQUIBASE_COMMAND_CHANGELOG_FILE=db.changelog-master.xml
COPY . /liquibase/changelog
WORKDIR /liquibase/changelog

CMD ["update"]

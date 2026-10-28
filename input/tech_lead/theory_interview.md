# Theory Questions
## Software Architecture 
1. What architecture would you use to structure a RESTful API or a web application? 
    - **Answer**: client architecture, API Gateways, controller layer, service layer, data access layer, database layer, external services, security layer, monitoring and logging and Deployment Layer
2. Name and describe two design patterns that you are familiar with such as Singleton pattern. 
    - **Answer**: singleton design pattern - use a single class. One instance and provide global access to it. Used for shared configurations, logging or caching.
    Dependancy injection: Manages the dependancy bectween object  by oinjecting at runtime 
    Repository pattern: provides a layer of abstraction over the data access logic making it easier to switch database. used with entity framework
3. If two companies partner and integrate their systems, how could they enable a company's users to access the other company's systems while still using their original company credentials (i.e. the same user account and username/password)? 
    - **Answer**: SSO(Single Sign On), API Based Integration

## Cloud
1. If you had an API and a SPA, which resources would you create in a cloud project or resource group to deploy them? 
    - **Answer**: Azure App Service - PAAS that simplifies deploying and managing API
    Azure Function - if API is wireless or event drivent Azure function can be used e.g - microservices architecture and lightweight API
    Azure SQL or Cosmos DB id needed for data storage
    SPA - Azure ststic web apps  - SPA integration CI/CD workflow
    Azure BLOB storage with static website hosting
 
2. What advantages and disadvantages are there between having a microservice deployed to a VM, a Kubernetes cluster and cloud functions (AWS lambda, Azure Function or GCP cloud run). 
    - **Answer**: 
    Advantages:
    Full Control- complete control over environment(OS, Configuration)
    Flexibility - Get to host any application or runtime without restriction
    Stateful Application - Better Suited for hosting stateful application compared to Serverless or Kubernetes
    Custom Networking - Easier to implement complex application
    No OverHead - No over head orchestration or serverless abstraction
    
    Disadvantages:
    Management Overheadwe must handle OS update, scaling, load Balancing,
    patches manually
    Scalability - Scaling is slow compared to Kubernetes or serverless option
    High Cost for Scaling - Additional VMS needed which can be expensive for small work loads
    Complex Deployment - We need to manage CI/CD pipelines and deployment scripts

## DevOps
1. You need to create a solution to manage the lifecycle of infrastructure and application resources across different environments, enabling continuous integration and continuous delivery. Additionally, ensure infrastructure changes are versioned and easily reversible. What tool would you use to implement this solution in a controlled and efficient way? 
    - **Answer**: 
        1) ARM( Azure Resource Manager) Templates: 
        Declarative syntax for managing Azure resource
        Native to Azure and well integrated with Azure Devops
        Support Parametrized to deploy to different environment(Dev, QA, Prod)
        Use caes:best for team focused on Azure and comfortable with JSON Based templated
        
        2) Terraform
        
        3) Bicep
        
        4) Ansible
        
        5) Azure pipelines and YAML
        
        6) Azure DevOps Environments and Approvals
2. What approach would you use to start a fresh database each time your application integration tests run? 
    - **Answer**: 
    Approach 1:
    Use Azure SQL Database - use a temporary Azure SQL Database suring pipeline run
    
    Run Initialization Script - Apply Schema and seed data using tools like SQLSMD, EF Core Migration or Liquibase
    
    Run Integration Test
    
    Delee temprrary DataBase
    
    Approach 2:
    
    Initiate the Database
    Run Integration test
    twar down Container
    Approach 3
    
    Configure Test Environment
    RunRun Integration test\

## SQL
1. How would you approach improving the performance of a slow query?  
    - **Answer**: 
    1) Normalization: Eliminates redundant data by normalizing your database up to an appropriate normal form
    2) Denormalization: Critical queries consider denormalization to reduce number of joins
    3) Partitioning: Use horizontal or vertical partitioning large tables to improve query performance
    4) Proper data types: INT, BIGINT, VARCHAR 
    5) Indexing Create indexes on frequently queried columns especially for WHERE clauses JOINS and ORDERBY clauses
    6) Avoid Over Indexing
    7) USE covering indexes
    8) Optimizing SQL queries: Use EXPLAIN plans Analyze query execution plans to identity like - tables, scans index usage)
    9) Use joins Efficiently
    10) Avoid Correlated Subqueries
    11) Query Caching
2. What is the downside of adding new indexes to a table? 
    - **Answer**: 
    1) Increased Storage Usage: Indexes consume additional disk space which grows with the size of the table
    Large tables with multiple indexes can require significant storage.
    2) Slower Write Operation: Indexes need to be updated whenever data in the indexes column is modified
    3) Maintenance Overhead: Index require maintenance to avoid fragmentation
    4) Risk of Over Indexing: Adding too many indexes can lead to diminishing returns and performance degradation.
    5) Bulk Operation slowness: Bulk INSERT UPDATE DELETE operations are slower with many indexes
    1. Programming Language:   Python
        - Role: Data Scientist (Generative AI Developer) Specific tasks:   During the 4 POCs I have used python to connect the LLM by langchain, Llamaindex, to manipulate data byusing pandas pyspark dataframe. to train, fine tune, test and deploy model, to do prompt engineering.This was from last 1.7 years and still I am working on this.

## Auth
1. What is OAuth?  
    a. Which OAuth flow you would use for machine to machine authentication. 
    b. Which OAuth flow you would use to authenticate a user to a web app.
    - **Answer**: 
    OAuth - Open Authentication is an open standard for Authorization that allows third party application to access user data without exposing user credentials like password. Commonly used for social media API like google, Facebook etc.
    
    a) OAuth 2.0 Client Credentials Grant to authenticate Machine  to machine flow.
    Server Issue Access Token.
    Client Access Resource Server.
    
    b) Code Access Token.
    redirect URL.
    Session Management.
    SSO.
2. Explain what are ACL, RBAC and ABAC use for. Provide as much details as possible. 
    - **Answer**: 
    1) ACL - List of permissions associated with a resource like file, directory, database object etc that specifies which user or group can access the resource. Each entry in ACL represents a permission granted or denied to a specific user or group
    TYPES:
    
    DAC(Discretionary Access Control): The resource owner has ability to grant or deny access to their resource.
    
    MAC(Mandatory Access Control): The access to resource is regulated based and security level is predefined.
    
    2) RBAC(Role Based Access Control): In RBAC user are assigned roles and permissions are granted to those roles ACLs can be implemented on top of this model to manage access for each one.
    Role Hierarchies
    Constraints
    
    3) ABAC(Attribute Based Access Control): It is an access control model that manages access to resource based on the attributes of the user, resource and the environment. Unlike RBAC where access is granted based on user's role ABAC takes a wider range of factor including user attributes, resource attribute, environmental conditions
    Components:
    Subject Attributes
    Object Attributes
    Action Attributes
    Environmental Attributes
 
## Agile
1. Mention the agile ceremonies you are familiar with and their purpose. 
    - **Answer**: 
    1) Sprint Planning - Plan work for Upcoming sprint
    Frequency -At the start of each sprint
    Participants - Product Owner, Scrum Master Development Team
    
    2) Daily Standup - Sync work discuss backlogs and align team.
    Frequency - Daily for around 15 min
    Participants - Development Team, Scrum Master (optional Product Owner)
    
    3) Sprint Review - Demonstrate and review the completed work with stakeholders
    Frequency - At the end of each sprint
    Participants - Product Owner, Scrum Master, Deployment Team,Stakeholder
    
    4) Sprint Retrospective - reflects on the sprint and identify improvements
    Frequency - At the end of each sprint.
    Participants - Scrum Master, Development Team, (optional Product Owner)
    
    5) Backlog Refinement - refine and Prioritize the product Backlog.
    Frequency - Ongoing once or twice per sprint.
    Participants - Product Owner, Scrum Master, Development Team

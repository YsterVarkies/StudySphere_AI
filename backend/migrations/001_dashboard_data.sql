CREATE TABLE IF NOT EXISTS USER_MODULE (
    user_id INT NOT NULL,
    module_id INT NOT NULL,
    cohort_id INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, module_id),
    CONSTRAINT fk_user_module_user FOREIGN KEY (user_id) REFERENCES `USER`(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_module_module FOREIGN KEY (module_id) REFERENCES `MODULE`(module_id) ON DELETE CASCADE,
    CONSTRAINT fk_user_module_cohort FOREIGN KEY (cohort_id) REFERENCES COHORT(cohort_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS DASHBOARD_DEADLINE (
    deadline_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    module_id INT NULL,
    title VARCHAR(255) NOT NULL,
    due_at DATETIME NOT NULL,
    item_type ENUM('assignment', 'exam', 'study') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_deadline_user FOREIGN KEY (user_id) REFERENCES `USER`(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_deadline_module FOREIGN KEY (module_id) REFERENCES `MODULE`(module_id) ON DELETE SET NULL,
    INDEX idx_deadline_user_due (user_id, due_at)
);

CREATE TABLE IF NOT EXISTS DASHBOARD_DOCUMENT (
    document_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    module_id INT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
    file_type VARCHAR(32) NOT NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accessed_at DATETIME NULL,
    CONSTRAINT fk_dashboard_document_user FOREIGN KEY (user_id) REFERENCES `USER`(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_dashboard_document_module FOREIGN KEY (module_id) REFERENCES `MODULE`(module_id) ON DELETE SET NULL,
    INDEX idx_dashboard_document_user_recent (user_id, uploaded_at, accessed_at)
);

CREATE TABLE IF NOT EXISTS AI_CHAT_USAGE (
    usage_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_chat_usage_user FOREIGN KEY (user_id) REFERENCES `USER`(user_id) ON DELETE CASCADE,
    INDEX idx_ai_chat_usage_user_created (user_id, created_at)
);

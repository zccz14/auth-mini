use std::fs;
use std::io;
use std::path::Path;

pub(crate) fn read_openapi_yaml(openapi_path: &Path) -> io::Result<String> {
    fs::read_to_string(openapi_path)
}
